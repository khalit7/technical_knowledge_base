"""A real Alembic run against the chat database: the models gain chats.pinned and an index on messages.chat_id,
`alembic revision --autogenerate` writes the migration, and `alembic upgrade head --sql` prints the SQL it would run.
Writes ../inputs/alembic.json (the generated file and the SQL). Run from a scratch directory:
  uv run --no-project --python 3.12 --with pgserver --with 'psycopg[binary]' --with 'sqlalchemy>=2' --with alembic python alembic_demo.py"""
import os, sys, io, re, tempfile, contextlib, importlib.metadata as md
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pgc import *
from alembic.config import Config
from alembic import command

start()
with conn('postgres') as c:
    c.execute('DROP DATABASE IF EXISTS alembic_demo WITH (FORCE)'); c.execute('CREATE DATABASE alembic_demo TEMPLATE chat')
URL_SA = f'postgresql+psycopg://postgres@127.0.0.1:{PORT}/alembic_demo'
d = tempfile.mkdtemp(prefix='alembic'); os.chdir(d)
cfg = Config(os.path.join(d, 'alembic.ini')); cfg.set_main_option('script_location', os.path.join(d, 'migrations'))
command.init(cfg, os.path.join(d, 'migrations'))
cfg = Config(os.path.join(d, 'alembic.ini')); cfg.set_main_option('sqlalchemy.url', URL_SA)
open(os.path.join(d, 'models.py'), 'w').write('''import sqlalchemy as sa
URL = %r
md = sa.MetaData()
md.reflect(sa.create_engine(URL))
chats = md.tables["chats"]
# the change being made: chats get a pinned flag; messages.chat_id gets the index section 2 recommends
chats.append_column(sa.Column("pinned", sa.Boolean(), nullable=False, server_default=sa.false()))
sa.Index("messages_chat_id_idx", md.tables["messages"].c.chat_id)
target_metadata = md
''' % URL_SA)
env = open(os.path.join(d, 'migrations', 'env.py')).read()
env = env.replace('target_metadata = None', 'import sys; sys.path.insert(0, %r)\nfrom models import target_metadata' % d)
open(os.path.join(d, 'migrations', 'env.py'), 'w').write(env)
command.revision(cfg, message='add chats.pinned and an index on messages.chat_id', autogenerate=True, rev_id='3f1c0a9d2b11')
vers = os.path.join(d, 'migrations', 'versions'); f = [x for x in os.listdir(vers) if x.endswith('.py')][0]
gen = open(os.path.join(vers, f)).read()
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    command.upgrade(cfg, 'head', sql=True)
sql = buf.getvalue()
gen = re.sub(r'Create Date: .*', 'Create Date: (removed)', gen)
save('alembic.json', {'alembic': md.version('alembic'), 'sqlalchemy': md.version('sqlalchemy'), 'file': f, 'migration': gen, 'sql': sql})
print(gen); print(sql)
