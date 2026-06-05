# Grupa-Lom-Project2-Clean-Win

### Application aiming to boost people interest about the environment. Users can easy send a photo of contaminate with rubbish place. Then it can be cleaned and for this job the people to receive points. Gesture is important, if the application have sponsors, the people with max points can get a reward - ticket, money reward.

## Frontend

The web frontend is a Next.js 16 App Router application in `frontend-next/`.

Local dev: `cd frontend-next && npm install && npm run dev` → http://localhost:3000

Inside docker-compose: brought up automatically by `docker compose up frontend`.

Tests: `cd frontend-next && npm test` (vitest).

#### Plese run this only once before strat codding. For automatic hooks
```
./setup.ps1
```

##### For checking all of the commits
```
pre-commit run --all-files
pre-commit run --config .pre-push-config.yaml --hook-stage pre-push --all-files
```
