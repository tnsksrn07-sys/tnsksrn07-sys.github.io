@echo off
rem deploy-github-pages.cmd
rem Usage: deploy-github-pages.cmd <github-username>
rem Example: deploy-github-pages.cmd tnsksrn07-sys

if "%~1"=="" (
  echo Usage: %~nx0 ^<github-username^>
  echo.
  echo This script initializes the current folder as a git repository, commits all files,
  echo sets the branch to main, and pushes to your GitHub Pages repo:
  echo https://github.com\<github-username>\<github-username>.github.io.git
  goto :eof
)

set "GITHUB_USER=%~1"
set "REMOTE_URL=https://github.com/%GITHUB_USER%/%GITHUB_USER%.github.io.git"

echo Initializing git repository in %CD% ...
git init
if %ERRORLEVEL% neq 0 (
  echo Git initialization failed. Make sure git is installed and on your PATH.
  goto :eof
)

echo Adding repository files...
git add .
if %ERRORLEVEL% neq 0 (
  echo Git add failed.
  goto :eof
)

echo Committing files...
git commit -m "Deploy Next Billion Technology static site" 2>nul
if %ERRORLEVEL% neq 0 (
  echo No changes to commit or commit failed. Continuing...
)

echo Setting branch to main...
git branch -M main
if %ERRORLEVEL% neq 0 (
  echo Failed to set branch to main.
  goto :eof
)

echo Configuring remote origin to %REMOTE_URL% ...
git remote remove origin 2>nul
git remote add origin %REMOTE_URL%
if %ERRORLEVEL% neq 0 (
  echo Failed to add remote origin.
  goto :eof
)

echo Pushing to GitHub Pages repository...
git push -u origin main
if %ERRORLEVEL% neq 0 (
  echo Git push failed. Check your GitHub credentials and repository existence.
  goto :eof
)

echo.
echo Deployment complete. Your site should be available at:
echo https://%GITHUB_USER%.github.io
