

import pandas as pd

def inspect_excel(file_path):
    try:
        df = pd.read_excel(file_path)
        print(f"Análise do arquivo: {file_path}")
        print("\nAs 5 primeiras linhas:")
        print(df.head())
        print("\nInformações das colunas:")
        df.info()
    except FileNotFoundError:
        print(f"Erro: O arquivo '{file_path}' não foi encontrado.")
    except Exception as e:
        print(f"Ocorreu um erro: {e}")

if __name__ == "__main__":
    inspect_excel('2025_staysBD.xlsx')

