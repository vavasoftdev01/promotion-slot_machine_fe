## Running with Docker

### Build

```sh
docker build -t promotion-slot-machine-fe .
```

### Run

```sh
docker run -p 80:80 promotion-slot-machine-fe
```

The nginx server will serve the app on port 80 and proxy `/promotion-ace/*` requests to the backend container at `http://backend:3001`. If the backend runs on a different host, pass the `VITE_API_URL` build arg:

```sh
docker build -t promotion-slot-machine-fe --build-arg VITE_API_URL=http://your-backend-host:3001 .
```
