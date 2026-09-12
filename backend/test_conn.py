import psycopg2

conn = psycopg2.connect(
    host="aws-0-ap-northeast-2.pooler.supabase.com",
    port=6543,
    dbname="postgres",
    user="postgres.vqtvyshqjrhpsyepozhu",
    password="Hackout_cosmis",
    connect_timeout=10
)
cur = conn.cursor()
cur.execute("SELECT version();")
print("Postgres version:", cur.fetchone()[0])

cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
tables = [row[0] for row in cur.fetchall()]
print(f"Public tables count: {len(tables)}")
print("Tables:", tables)

cur.close()
conn.close()
