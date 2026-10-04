"""Shared by citus_run.py and citus_rebal.py: the Citus-enabled PostgreSQL 16.2 build (env CITUS_PG) and the node config."""
import os, subprocess
from pgc import PG, in_use
CB = os.path.join(os.environ['CITUS_PG'], 'bin')
class CPG(PG):
    """same helper, but the Citus-enabled PostgreSQL build"""
    def init(self, conf=''):
        os.makedirs(self.dir, exist_ok=True)
        if not os.path.exists(self.data):
            r = subprocess.run([f'{CB}/initdb', '-D', self.data, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C'], capture_output=True, text=True)
            if r.returncode: raise RuntimeError(r.stderr)
            open(os.path.join(self.data, 'postgresql.conf'), 'a').write('\n' + conf + '\n')
    def running(self):
        return subprocess.run([f'{CB}/pg_ctl', '-D', self.data, 'status'], capture_output=True).returncode == 0
    def start(self):
        if self.running(): return 'already running'
        if in_use(self.port): raise RuntimeError(f'port {self.port} in use; refusing')
        r = subprocess.run([f'{CB}/pg_ctl', '-D', self.data, '-o', f"-p {self.port} -k '' -h 127.0.0.1", '-l', self.dir + '/log', '-w', 'start'], capture_output=True, text=True)
        return r.stdout + r.stderr
    def stop(self):
        return subprocess.run([f'{CB}/pg_ctl', '-D', self.data, '-m', 'fast', '-w', 'stop'], capture_output=True, text=True).stdout
    def psql(self, sql, db='chat', tuples=True):
        a = [f'{CB}/psql', '-h', '127.0.0.1', '-p', self.port, '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-X', '-q'] + (['-At'] if tuples else [])
        r = subprocess.run(a + ['-c', sql, db], capture_output=True, text=True)
        if r.returncode: raise RuntimeError(r.stderr + '\nSQL: ' + sql[:300])
        return r.stdout.strip()
CONF = """shared_preload_libraries = 'citus'
citus.local_hostname = '127.0.0.1'
shared_buffers = 256MB
max_connections = 300
wal_level = logical
max_wal_size = 4GB
max_replication_slots = 20
max_wal_senders = 20
max_worker_processes = 32"""
