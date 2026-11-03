# CRM Project #

A full-stack **Customer Relationship Management (CRM)** web application to manage customers, leads and sales activity in one place. Built with a **TypeScript** front-end and server, and a **Python** back-end service.

![TypeScript](https://img.shields.io/badge/TypeScript-77%25-3178c6)
![Python](https://img.shields.io/badge/Python-22.3%25-3776ab)
![Bun](https://img.shields.io/badge/Bun-000000?logo=bun&logoColor=white)

🔗 **Live Demo:** 

# 📌 About #

This CRM helps teams keep track of their customers and sales pipeline. It centralizes contact information, follows leads from first contact to closed deal, and gives a clear overview of business activity through a simple dashboard.

# ✨ Features #

- **Customer and contact management** – store, search and update customer details
- **Lead tracking** – follow leads through each stage of the sales pipeline
- **Deals and sales pipeline** – monitor deal status and value
- **Tasks and follow-ups** – never miss a call, meeting or reminder
- **Dashboard and reports** – quick overview of customers, leads and sales performance
- **Authentication** – secure login with user accounts
- **Responsive design** – works on desktop, tablet and mobile

> Edit this list so it matches the features your CRM really has. Remove anything that is not built yet.

# Tech Stack #

- **TypeScript** – front-end and server
- **Bun / Node.js** – runtime and package management
- **Python** (3.10 or higher recommended) – back-end service (data processing, API or automation)
- **Render** – hosting and deployment
- Add your frameworks, libraries and database here (for example React, Vite, Express, FastAPI, PostgreSQL)

# 📁 Project Structure #

```
crm-project/
├── backend_python/      # Python back-end service
├── server/              # Server-side TypeScript code
├── src/                 # Front-end source code
├── server.ts            # Server entry point
├── index.html           # Front-end entry page
├── metadata.json
├── package.json         # JavaScript dependencies and scripts
├── bun.lock             # Bun lock file
├── requirements.txt     # Python dependencies
├── render.yaml          # Render deployment configuration
├── .env.example         # Example environment variables
└── README.md
```

## 🚀 Getting Started ##

### Prerequisites ###

- [Bun](https://bun.sh/) (or [Node.js](https://nodejs.org/) v18+ with npm)
- [Python 3.10+](https://www.python.org/downloads/) and pip
- Git

### 1. Clone the repository

```bash
git clone https://github.com/rowshanara01/your-repo-name.git
cd your-repo-name
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

On Windows Command Prompt, use `copy .env.example .env`, then fill in your own values in `.env`.

### 3. Install and run the TypeScript app ###

```bash
bun install
bun run dev
```

Using npm instead:

```bash
npm install
npm run dev
```

### 4. Set up and run the Python service ###

Open a second terminal:

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
python backend_python/main.py
```

### Build for production ###

```bash
bun run build
```

## 🔐 Environment Variables  ##

Copy `.env.example` to `.env` and set your own values. Typical variables include:

```env
PORT=3000
DATABASE_URL=your_database_url_here
JWT_SECRET=your_secret_key_here
PYTHON_SERVICE_URL=http://127.0.0.1:8000
```

> Never commit your `.env` file to GitHub. It is already listed in `.gitignore`.

## 📸 Screenshots

```md
![Dashboard](screenshots/dashboard.png)
![Customers](screenshots/customers.png)
```

## 🌐 Deployment

This project includes a `render.yaml` file, so it can be deployed on **Render**:

1. Push your code to GitHub
2. In Render, choose **New → Blueprint** and select this repository
3. Add your environment variables in the Render dashboard
4. Deploy. Render will build and start the services defined in `render.yaml`

## 🗺️ Roadmap

- [ ] Email integration for customer communication
- [ ] Import and export customers (CSV)
- [ ] Advanced reports and charts
- [ ] Role-based access control

> Replace these with your real plans, or remove this section.

## 🤝 Contributing ##

Contributions, issues and feature requests are welcome.

1. Fork the repository
2. Create your branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m "Add new feature"`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

## 📄 License ##

This project is licensed under the MIT License.

## 👩‍💻 Author ##

**Rowshanara Akhter**

- GitHub: [@rowshanara01](https://github.com/rowshanara01)
