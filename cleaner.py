import pandas as pd

def clean_data(input_path, output_path):
    """
    Lê, limpa, transforma e salva os dados da planilha.
    """
    try:
        # Carrega a planilha, pulando as linhas iniciais e definindo o cabeçalho
        df = pd.read_excel(input_path, header=4)

        # Remove colunas e linhas completamente vazias
        df.dropna(axis='columns', how='all', inplace=True)
        df.dropna(axis='rows', how='all', inplace=True)

        # Renomeia as colunas
        df.columns = [
            'Unidades', 'Metrica_Unidades', 'Reservas', 'Metrica_Reservas',
            'Faturamento', 'Metrica_Faturamento', 'Comissao_Gonzaga'
        ]

        # Converte colunas para numérico, tratando erros
        numeric_cols = ['Unidades', 'Reservas', 'Faturamento', 'Comissao_Gonzaga']
        for col in numeric_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce')

        # Preenche valores nulos em colunas numéricas com 0
        df[numeric_cols] = df[numeric_cols].fillna(0)

        # Salva o arquivo limpo em formato CSV
        df.to_csv(output_path, index=False)

        print(f"Dados limpos e salvos em '{output_path}'")
        print("\nVisualização dos dados limpos:")
        print(df.head())

    except FileNotFoundError:
        print(f"Erro: O arquivo '{input_path}' não foi encontrado.")
    except Exception as e:
        print(f"Ocorreu um erro durante a limpeza: {e}")

if __name__ == "__main__":
    clean_data('stays.xlsx', 'stays_cleaned.csv')
