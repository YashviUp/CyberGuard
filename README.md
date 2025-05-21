# CyberGuard Chrome Extension
Made By CyberGuard Team for Compassion-A-Thon 2.0:
[Tatiparthi Raghavendra Reddy](23f2002940@ds.study.iitm.ac.in)
[Yashvi Upadhyay](24f2007780@ds.study.iitm.ac.in)
### [CyberGuard DEMO VIDEO📺🔗](https://drive.google.com/file/d/18AdT5Wg1GEEeac3Cv29xmeM8lutj3JzX/view?usp=sharing)
### Features🤖
1. Profanity-check of explicit/abusive words you type inside website/search bar for & alerts you, Regularly update our datasets with Indian bad-word, with new slang, acronyms & tactics.
2. ML model to detect Phishing Websites. Extract 30 features: IP geolocation, Blacklist, alphanumeric domains, payment popups, requesting unnecessary permissions (camera, SMS), etc.
3. Social Media & sites Screen time motivational Reminder without restricting you, full Customer freedom. Shows Daily Weekly Bar Charts
4. float popups like 'Use strong password', 'Sensitve field alert' for Bank & shopping login & payment gateways
5. "Report" button to [cybercrime.gov](cybercrime.gov.in) authorities & it's safety guidelines
7. Parental Dashboard: monitor child's Unsecure/Explicit warning reports, Acitvity log. Parental Controls like "sleep mode" during bedtime. age-appropriate restrictions, disable DMs, parent 2-factor email otp authentication for any new Logins. No warnings or flashes to children (prototype stage)

[Compassion-A-thon 2.0 slides](https://docs.google.com/presentation/d/17qy9XTDllV1emOcEeT_hT0rKvmnm8gRefFuDwI8hClE/edit?usp=sharing)
[Features Roadmap](https://docs.google.com/document/d/1-DmBus_-4BKtybs03VGKvMj0MCYGvAUoUQqLw9GVIdk/edit?usp=sharing)
## Project Structure

```
CYBERGUARD/
├── dist/ web pack bundles for CSP chrome extension compatibility
│   ├── bad-words.bundle.js        Profanity filter and bad words list (bundled)
│   ├── chart.umd.js               Chart.js library (local, for CSP compliance)
│   ├── content.bundle.js          Bundled content script (if using Webpack)
│   ├── content.bundle.js.LICENSE.txt
│   └── main.js                    Main bundle (if using Webpack)
├── icons/
│   └── ...                        Site and default icons (used in dashboard and popup)
├── node_modules/                  Node.js dependencies (not included in repo)
├── .gitignore                     Git ignore rules
├── background.js                  Handles time tracking, tab/window events,alarms, messaging bw extension parts
├── content.js                     Extracts phishing features, runs the neural net & shows popups for phishing/sensitive/explicit content.
├── dashboard.css                  Styles for the dashboard page
├── dashboard.html                 Fullscreen dashboard for visualizing usage statistics and site breakdowns, with bar charts via Chart.js
├── dashboard.js                   Dashboard logic (site usage, charts, etc.)
├── index.js                       Entry point for bundling or other JS logic
├── manifest.json                  Declares extension permissions, content/background scripts, web accessible resources, and CSP
├── package-lock.json              NPM lock file
├── package.json                   NPM project file
├── phishing-weights.json          Neural network weights for phishing detection (JSON array)
├── popup.css                      Styles for popup.html
├── popup.html                     popup for quick access to usage stats
├── popup.js                       Popup logic (site usage, phishing test, dashboard open)
├── README.md                      Project documentation (you're reading it!)
├── webpack.config.js              Webpack configuration bundles tensorflow bad-words chart.js
```


- Make sure all local scripts (like Chart.js) are listed in `manifest.json` under `web_accessible_resources`.
- Never load remote scripts or use inline event handlers due to Chrome Extension CSP.
- To update weights, convert your `.bin` to JSON and replace `phishing-weights.json`.
