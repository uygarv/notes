# Collaboration deployment

The collaboration service runs beside `notes-api` on port `3002`. Production
requires Node 22+, `JWT_SECRET`, `DATABASE_URL`, `WEB_URL`, and the same
`COOKIE_DOMAIN=.uygarv.com` used by the API.

Configure the reverse proxy on `notes-api.uygarv.com` to pass WebSocket upgrades
for `/collaboration` to `http://127.0.0.1:3002`:

```nginx
location /collaboration {
  proxy_pass http://127.0.0.1:3002;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_set_header Cookie $http_cookie;
  proxy_set_header Origin $http_origin;
}
```

Set `NEXT_PUBLIC_COLLAB_URL=wss://notes-api.uygarv.com/collaboration` on the
web deployment. Local development uses `ws://localhost:3002` by default.
