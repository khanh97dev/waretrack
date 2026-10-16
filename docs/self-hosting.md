# Self-hosting WareTrack

WareTrack is a static site: the whole game is a single `index.html` that loads
Three.js r128 and Google Fonts from CDNs. There is no build step, no server-side
code and no API. Any web server that can hand out files will run it — a
container is just the most repeatable way to do that.

> **Note:** the browser needs internet access to fetch Three.js and the fonts.
> The host/container serving the files does *not*.

## Quick start with Podman

From the repository root:

```bash
podman run -d --name waretrack \
  -p 2222:80 \
  -v "$PWD":/usr/share/nginx/html:ro,Z \
  docker.io/library/nginx:alpine
```

Then open <http://localhost:2222/>.

`-p 2222:80` publishes container port 80 on **all host interfaces**
(`0.0.0.0:2222`), so other machines on the network can reach it at
`http://<host-ip>:2222/` as well. Use `-p 127.0.0.1:2222:80` to keep it
local-only.

The `:Z` on the volume relabels the folder for SELinux. Drop it on hosts
without SELinux; it is harmless either way. The mount is `:ro` because the
game writes nothing to disk — all progress is kept in the browser's
`localStorage`.

### Docker instead of Podman

The same command works with Docker; only the `:Z` flag is meaningless there:

```bash
docker run -d --name waretrack \
  -p 2222:80 \
  -v "$PWD":/usr/share/nginx/html:ro \
  nginx:alpine
```

## Accessing the site

| Where | URL |
| --- | --- |
| Same machine | <http://localhost:2222/> |
| Another machine | `http://<host-ip>:2222/` |
| Local only | use `-p 127.0.0.1:2222:80` |

`0.0.0.0` is a bind address, not a destination — in a browser use
`localhost`, the host's LAN IP, or a domain name instead.

## Operating the container

| Task | Command |
| --- | --- |
| Status | `podman ps --filter name=waretrack` |
| Logs | `podman logs waretrack` |
| Stop | `podman stop waretrack` |
| Start again | `podman start waretrack` |
| Remove | `podman rm -f waretrack` |

To keep the site up across reboots, recreate the container with a restart
policy:

```bash
podman rm -f waretrack
podman run -d --name waretrack --restart=always \
  -p 2222:80 \
  -v "$PWD":/usr/share/nginx/html:ro,Z \
  docker.io/library/nginx:alpine
```

### Updating

Because the folder is bind-mounted, a `git pull` in the repository is picked
up immediately — nginx re-reads the file on the next request, so there is
nothing to rebuild or restart unless you want to be sure caches are dropped:

```bash
git pull
podman restart waretrack
```

If the browser still shows the old version, hard-reload (Ctrl/Cmd+Shift+R);
`index.html` is served fresh but the browser may hold a cached copy.

## Serving without a container

Any static server works, e.g.:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Opening `index.html` directly from the filesystem (`file://`) also works in
most browsers, but a real HTTP server avoids cross-origin quirks with the
CDN assets and is what the container does under the hood.

## Hosted deployment

The site is static, so the usual free hosts work with no configuration:
Vercel (import the repo, no framework preset, no build command), Netlify, or
GitHub Pages. There is nothing to build — point the host at the repository
root and it will serve `index.html`.
