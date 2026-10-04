"""A tiny TCP proxy that adds a fixed delay to every chunk in each direction, to imitate the network between an app server
and its database. Usage: python delay_proxy.py <listen_port> <target_port> <one_way_delay_ms>"""
import asyncio, sys
LP, TP, D = int(sys.argv[1]), int(sys.argv[2]), float(sys.argv[3]) / 1000

async def pump(r, w):
    try:
        while True:
            b = await r.read(65536)
            if not b: break
            await asyncio.sleep(D)
            w.write(b); await w.drain()
    except Exception:
        pass
    finally:
        try: w.close()
        except Exception: pass

async def handle(cr, cw):
    sr, sw = await asyncio.open_connection('127.0.0.1', TP)
    await asyncio.gather(pump(cr, sw), pump(sr, cw))

async def main():
    s = await asyncio.start_server(handle, '127.0.0.1', LP)
    async with s: await s.serve_forever()

asyncio.run(main())
