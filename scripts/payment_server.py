#!/usr/bin/env python3
"""直播小助理 - 支付回调中转服务"""
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import hashlib, json, time

PID = '52442152'
KEY = 'Y57iq6vZFIAEF7JuBEOyBdpZrqVTI5qgPnBf9RsxHQm56syeOgLC194iuloZLzBR'

# 存储已支付的订单 {trade_no: {planId, time}}
paid_orders = {}

def verify_sign(params):
    sign = params.get('sign', [''])[0]
    sign_type = params.get('sign_type', [''])[0]
    keys = sorted([k for k in params if k not in ('sign', 'sign_type')])
    sign_str = '&'.join(f'{k}={params[k][0]}' for k in keys) + KEY
    return hashlib.md5(sign_str.encode()).hexdigest() == sign

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)

        # 支付回调
        if parsed.path == '/pay/notify':
            params = parse_qs(parsed.query)
            print(f"[回调] {json.dumps({k:v[0] for k,v in params.items()}, ensure_ascii=False)}")

            if verify_sign(params) and params.get('trade_status', [''])[0] == 'TRADE_SUCCESS':
                trade_no = params.get('trade_no', [''])[0]
                plan_id = params.get('param', ['monthly'])[0]
                paid_orders[trade_no] = {'planId': plan_id, 'time': time.time()}
                print(f"[成功] trade_no={trade_no}, planId={plan_id}")
                self.send_response(200)
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(b'success')
            else:
                print(f"[失败] 签名不匹配或状态不对")
                self.send_response(200)
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(b'fail')
            return

        # 查询订单状态
        if parsed.path == '/check':
            params = parse_qs(parsed.query)
            trade_no = params.get('trade_no', [''])[0]
            if trade_no in paid_orders:
                result = {'paid': True, 'planId': paid_orders[trade_no]['planId']}
            else:
                result = {'paid': False}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            return

        # 健康检查
        if parsed.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'ok')
            return

        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        print(f"[{time.strftime('%H:%M:%S')}] {format % args}")

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 3456), Handler)
    print('支付回调服务已启动: http://0.0.0.0:3456')
    print('回调地址: http://139.224.244.62:3456/pay/notify')
    print('查询地址: http://139.224.244.62:3456/check?trade_no=XXX')
    server.serve_forever()
