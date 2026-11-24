from waitress import serve
from rbte.wsgi import application

if __name__ == "__main__":
    serve(application, host="127.0.0.1", port=8100, threads=4,
          trusted_proxy="127.0.0.1", trusted_proxy_headers={"x-forwarded-proto"},
          clear_untrusted_proxy_headers=True, max_request_body_size=32768,
          max_request_header_size=16384, channel_timeout=30, ident="RBTE")
