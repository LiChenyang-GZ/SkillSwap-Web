# Legacy README Run Notes

This file preserves the practical run notes and old handoff references that used to live in the root `README.md`. The root README now only describes the current project.

Original design reference from the old README:

```text
https://www.figma.com/design/b2aJ3vFhswCh9v8bZvw67t/Skill-Swap-Club-Web-App
```

## Frontend

```bash
cd skill-swap-frontend
npm install
npm run dev
```

Default Vite dev server:

```text
http://localhost:3000
```

## Backend

Make sure Java 17 is installed.

Create a local ignored environment file:

```text
skill-swap-backend/.env
```

Start backend from macOS/Linux:

```bash
cd skill-swap-backend
./gradlew bootRun --args="--spring.profiles.active=dev"
```

Start backend from Windows PowerShell:

```powershell
cd skill-swap-backend
.\gradlew.bat bootRun --args="--spring.profiles.active=dev"
```

Build backend from macOS/Linux:

```bash
cd skill-swap-backend
./gradlew build
```

Build backend from Windows PowerShell:

```powershell
cd skill-swap-backend
.\gradlew.bat build
```

Build the deployable backend JAR:

```bash
cd skill-swap-backend
./gradlew bootJar --no-daemon
```

## Git Workflow Notes

Update local `main`:

```bash
git pull origin main
```

Create a feature branch:

```bash
git checkout -b <new-branch-name>
```

Then commit, push, open a pull request, wait for checks/review, and merge through the PR flow.

## Windows: Kill Stuck Java/Gradle Processes

If local backend runs fail because too many Java/Gradle processes are stuck, this old Windows command can help:

```cmd
taskkill /IM java.exe /F
taskkill /IM gradle* /F
```

Use this only when you understand that it will terminate local Java/Gradle processes.
