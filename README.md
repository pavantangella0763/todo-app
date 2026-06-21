# Field Notes — Todo

A simple personal todo app: a Spring Boot REST API on the backend, and a
plain HTML/CSS/JS PWA on the frontend that you can install to your phone's
home screen.

```
todo-app/
├── frontend/     static PWA — HTML, CSS, JS, manifest, service worker, icons
└── backend/      Spring Boot REST API — Java 17, Maven, H2 database
```

## Prerequisites

- **Java 17+** and **Maven** (or use your IDE's bundled versions — VS Code's
  "Extension Pack for Java" + "Spring Boot Extension Pack" include both, so
  you don't need to install anything separately).
- A modern browser.

## Running the backend

```bash
cd backend
mvn spring-boot:run
```

The API starts on `http://localhost:8080`. Tasks are stored in a local file
database at `backend/data/tododb.mv.db` (gitignored, persists between
restarts). You can browse the data live at `http://localhost:8080/h2-console`
while the app is running (JDBC URL: `jdbc:h2:file:./data/tododb`, user `sa`,
no password).

In VS Code, you can also just open `TodoApplication.java` and click the
**Run** button above `main()` once the Java/Spring Boot extensions are
installed — no terminal needed.

### API reference

| Method | Endpoint               | Description                          |
|--------|-------------------------|---------------------------------------|
| GET    | `/api/tasks`             | List all tasks                       |
| POST   | `/api/tasks`              | Create a task — body: `{"text": "…"}` |
| PUT    | `/api/tasks/{id}/toggle`  | Toggle a task's done state           |
| DELETE | `/api/tasks/{id}`         | Delete a task                        |

## Running the frontend

The frontend is plain static files, so any local server works. The easiest
option in VS Code:

1. Install the **Live Server** extension.
2. Right-click `frontend/index.html` → **Open with Live Server**.

This serves it at `http://127.0.0.1:5500`, which is what you want for the
"Add to Home Screen" install prompt to work (it needs a real `http://`
origin, not a double-clicked file). Make sure the backend is running first —
the page will tell you if it can't reach it.

Once it's running, open the Live Server address on your phone (same Wi-Fi
network) and use your browser's "Add to Home Screen" option to install it.

## Pushing this to GitHub

From the `todo-app` folder:

```bash
git init
git add -A
git commit -m "Initial commit: Field Notes todo app"
```

Then create a new, empty repository on GitHub (don't initialize it with a
README or .gitignore, since you already have them), and:

```bash
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## Notes for extending later

- `backend/data/` and `backend/target/` are gitignored — your task data
  stays local and won't get committed.
- CORS is wide open (`allowedOrigins("*")`) in `CorsConfig.java` since this
  is for local personal use. Tighten that if you ever deploy it publicly.
- Swapping H2 for PostgreSQL later is just a matter of changing the four
  `spring.datasource.*` lines in `application.properties` and adding the
  Postgres driver dependency to `pom.xml`.
