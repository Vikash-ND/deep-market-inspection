\# 📈 Deep Market Inspection



A real-time stock market analysis platform built with \*\*FastAPI\*\* and \*\*Python\*\*.

Search any company by name, view live price data, and get technical indicator signals.



\## 🚀 Live Demo

[View Live App](https://deep-market-inspection.onrender.com)

\## ✨ Features

\- 🔍 Company name search with autocomplete (global + Indian stocks)

\- 📊 Interactive candlestick charts powered by Plotly

\- 📉 Technical indicators: RSI, MACD, Bollinger Bands, SMA/EMA

\- 🟢 Automatic BUY / SELL / NEUTRAL signals

\- ⚡ SQLite caching to reduce redundant API calls

\- 🌐 REST API with auto-generated Swagger docs



\## 🛠️ Tech Stack

| Layer | Technology |

|---|---|

| Backend | Python, FastAPI |

| Market Data | yfinance (Yahoo Finance) |

| Technical Analysis | ta (technical analysis library) |

| Caching | SQLite |

| Frontend | HTML, CSS, JavaScript |

| Charts | Plotly.js |

| Deployment | Docker, Render |



\## ⚙️ Run Locally



```bash

\# Clone the repo

git clone https://github.com/Vikash-ND/deep-market-inspection

cd deep-market-inspection



\# Create virtual environment

python -m venv venv

venv\\Scripts\\activate  # Windows

source venv/bin/activate  # Mac/Linux



\# Install dependencies

pip install -r requirements.txt



\# Start the server

uvicorn app.main:app --reload

```



Open `http://127.0.0.1:8000` in your browser.



\## 📡 API Endpoints

| Method | Endpoint | Description |

|---|---|---|

| GET | `/api/v1/search?q=Apple` | Search companies by name |

| GET | `/api/v1/stock/{ticker}` | Get stock info |

| GET | `/api/v1/stock/{ticker}/history` | Get price history |

| GET | `/api/v1/stock/{ticker}/analysis` | Full technical analysis |

| GET | `/api/v1/stocks/compare?tickers=AAPL,TSLA` | Compare stocks |

| GET | `/docs` | Interactive API docs |



\## 📁 Project Structure

```

deep-market-inspection/

├── app/

│   ├── main.py        # FastAPI app + middleware

│   ├── routers.py     # All API routes

│   ├── data.py        # yfinance data fetching

│   ├── analysis.py    # Technical indicators

│   ├── cache.py       # SQLite caching

│   ├── models.py      # Pydantic models

│   └── static/        # Frontend dashboard

│       ├── index.html

│       ├── style.css

│       └── app.js

├── Dockerfile

├── requirements.txt

└── README.md

```

