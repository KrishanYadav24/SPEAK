# VIT TESTING AGENCY - Voice Exam System

A web-based proctored examination system featuring voice-activated controls, automated authorization, and an admin dashboard.

## Project Structure
- `index.html`: Main user interface and screen definitions.
- `style.css`: JEE-inspired styling and layout management.
- `script.js`: Core logic for voice recognition, Firebase integration, and exam flow.
- `questions.json`: Local question bank (editable).

## Features
- **Hands-Free Operation**: Voice navigation and response recording using Web Speech API.
- **Admin Portal**: 
  - Authorize student entry.
  - Set exam duration.
  - Upload/update question sets.
  - Download student responses as readable TXT files.
- **Proctoring UI**: Real-time microphone monitoring and automated time warnings.
- **Automated Flow**: Authorization countdown and automatic redirect upon completion.

## Setup
1. Configure Firebase in `script.js`.
2. Edit `questions.json` to add your assessment content.
3. Open `index.html` in a web browser.
