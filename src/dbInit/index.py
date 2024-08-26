import json
import os

import boto3
import psycopg


def handler(event, context):
    db_secret_arn = os.environ['DB_SECRET_ARN']
    db_names = event['ResourceProperties']['dbNames']

    secrets_manager = boto3.client('secretsmanager')
    secret_value = secrets_manager.get_secret_value(SecretId=db_secret_arn)
    secret_data = json.loads(secret_value['SecretString'])

    with psycopg.connect(f"host={secret_data['host']} port={secret_data['port']} user={secret_data['username']} password={secret_data['password']} dbname=postgres", autocommit=True) as conn:
        try:
            with conn.cursor() as cur:
                for db_name in db_names:
                    cur.execute(f"CREATE DATABASE {db_name}")
            print(f"Databases {', '.join(db_names)} created successfully.")
        except Exception as e:
            print(f"Error creating databases: {str(e)}")
            raise e
        finally:
            conn.close()