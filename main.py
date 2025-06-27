import pandas as pd
import json
import shutil
from fastapi import FastAPI, HTTPException, UploadFile, File, Query, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional, List

from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from database import SessionLocal, engine, Base # Importa Base
from models import User

# Base.metadata.create_all(bind=engine) # REMOVIDO DAQUI

app = FastAPI()

# Configurações de segurança
SECRET_KEY = "your-secret-key" # Mude para uma chave secreta forte em produção
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

class ConfigUpdate(BaseModel):
    unidades_ativas: int
    gonzaga_commission_multiplier: float = 20.0

class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_role: str # Adiciona o papel do usuário ao token

class TokenData(BaseModel):
    email: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    role: str # Adiciona o papel do usuário na resposta

    class Config:
        orm_mode = True

class PasswordChange(BaseModel):
    new_password: str

class UserRoleUpdate(BaseModel):
    role: str

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Funções de autenticação
def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user

def get_config_data():
    try:
        with open('config.json', 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"unidades_ativas": 137, "gonzaga_commission_multiplier": 20.0}

# Função para verificar papel de administrador
def is_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado. Requer privilégios de administrador.")
    return current_user

# Pré-registro do usuário administrador
@app.on_event("startup")
def create_admin_user():
    # Base.metadata.create_all(bind=engine) # REMOVIDO DAQUI
    db = SessionLocal()
    admin_email = "marcos.otoni@gonzagaimoveis.com.br"
    admin_password = "basael"
    db_user = db.query(User).filter(User.email == admin_email).first()
    if not db_user:
        hashed_password = get_password_hash(admin_password)
        new_user = User(email=admin_email, hashed_password=hashed_password, role="admin") # Define o papel como admin
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        print(f"Usuário administrador {admin_email} criado com sucesso.")
    db.close()

# Endpoints de autenticação
@app.post("/register", response_model=Token)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email já registrado")
    hashed_password = get_password_hash(user.password)
    new_user = User(email=user.email, hashed_password=hashed_password, role="user") # Papel padrão é user
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user_role": new_user.role}

@app.post("/token", response_model=Token)
def login_for_access_token(form_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.email).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user_role": user.role}

# Endpoints protegidos
@app.get("/api/kpis")
def get_kpis(
    start_date: str = Query(default=(datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')),
    end_date: str = Query(default=datetime.now().strftime('%Y-%m-%d')),
    state_filter: str = Query(None),
    channel_filter: str = Query(None),
    current_user: User = Depends(get_current_user)
):
    try:
        df = pd.read_excel('2025_staysBD.xlsx')
        config_data = get_config_data()
        unidades_ativas = config_data.get("unidades_ativas", 137)
        gonzaga_commission_multiplier = config_data.get("gonzaga_commission_multiplier", 20.0)

        df.rename(columns={
            'Chegada': 'Check-In',
            'Data de checkout': 'Check-Out'
        }, inplace=True)

        df['Check-In'] = pd.to_datetime(df['Check-In'], errors='coerce')
        df['Check-Out'] = pd.to_datetime(df['Check-Out'], errors='coerce')

        df['Estado'] = df['Nome interno do anúncio'].apply(lambda x: 'Paraná' if str(x).startswith('C') or str(x).startswith('G') else 'Santa Catarina')

        if state_filter and state_filter != "Todos":
            df = df[df['Estado'] == state_filter]

        if channel_filter and channel_filter != "Todos":
            df = df[df['Canal'] == channel_filter]

        start_date_dt = pd.to_datetime(start_date)
        end_date_dt = pd.to_datetime(end_date)

        checkin_mask = (df['Check-In'] >= start_date_dt) & (df['Check-In'] <= end_date_dt)
        df_filtered_checkin = df.loc[checkin_mask]

        checkout_mask = (df['Check-Out'] >= start_date_dt) & (df['Check-Out'] <= end_date_dt)
        df_filtered_checkout = df.loc[checkout_mask]

        total_faturado = df_filtered_checkin['Total da fatura de hospedagem'].sum()
        total_reservas = len(df_filtered_checkin)
        check_ins = total_reservas
        check_outs = len(df_filtered_checkout)
        total_noites = df_filtered_checkin['Número de noites'].sum()
        
        ticket_medio = total_faturado / total_noites if total_noites > 0 else 0
        
        dias_no_periodo = (end_date_dt - start_date_dt).days + 1
        taxa_ocupacao = (total_noites / (dias_no_periodo * unidades_ativas)) * 100 if unidades_ativas > 0 else 0

        comissao_empresa = df_filtered_checkin['Comissão da empresa'].sum()
        total_taxa_limpeza = df_filtered_checkin['Taxas: Taxa de Limpeza'].sum()
        comissao_gonzaga_calculada = gonzaga_commission_multiplier * total_reservas

        return {
            "unidadesAtivas": unidades_ativas,
            "totalFaturado": total_faturado,
            "totalReservas": total_reservas,
            "checkIns": check_ins,
            "checkOuts": check_outs,
            "ticketMedio": ticket_medio,
            "taxaOcupacao": taxa_ocupacao,
            "comissaoEmpresa": comissao_empresa,
            "totalTaxaLimpeza": total_taxa_limpeza,
            "comissaoGonzagaCalculada": comissao_gonzaga_calculada
        }

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Arquivo de dados não encontrado.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ocorreu um erro ao calcular KPIs: {e}")

@app.get("/api/channels")
def get_channels(current_user: User = Depends(get_current_user)):
    try:
        df = pd.read_excel('2025_staysBD.xlsx')
        unique_channels = df['Canal'].dropna().unique().tolist()
        return unique_channels
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Arquivo de dados não encontrado.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ocorreu um erro ao buscar canais: {e}")

@app.get("/api/config")
def get_config(current_user: User = Depends(is_admin)):
    return get_config_data()

@app.post("/api/config")
def update_config(config_update: ConfigUpdate, current_user: User = Depends(is_admin)):
    try:
        with open('config.json', 'w') as f:
            json.dump(config_update.dict(), f, indent=4)
        return {"message": "Configuração atualizada com sucesso."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ocorreu um erro ao salvar a configuração: {e}")

@app.post("/api/upload")
def upload_file(file: UploadFile = File(...), current_user: User = Depends(is_admin)):
    if not file.filename.endswith('.xlsx'):
        raise HTTPException(status_code=400, detail="Formato de arquivo inválido. Por favor, envie um arquivo .xlsx")
    try:
        with open("2025_staysBD.xlsx", "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"message": f"Arquivo '{file.filename}' importado com sucesso."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Não foi possível salvar o arquivo: {e}")
    finally:
        file.file.close()

# Endpoints de gestão de usuários
@app.get("/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db), current_user: User = Depends(is_admin)):
    users = db.query(User).all()
    return users

@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(is_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if user.email == current_user.email:
        raise HTTPException(status_code=400, detail="Você não pode deletar seu próprio usuário.")
    db.delete(user)
    db.commit()
    return {"message": "Usuário deletado com sucesso"}

@app.put("/users/{user_id}/password")
def change_user_password(user_id: int, password_change: PasswordChange, db: Session = Depends(get_db), current_user: User = Depends(is_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    hashed_password = get_password_hash(password_change.new_password)
    user.hashed_password = hashed_password
    db.commit()
    return {"message": "Senha alterada com sucesso"}

@app.put("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(user_id: int, role_update: UserRoleUpdate, db: Session = Depends(get_db), current_user: User = Depends(is_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    user.role = role_update.role
    db.commit()
    db.refresh(user)
    return user