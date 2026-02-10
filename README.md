# 🃏 Holdem Chips - 线下德扑筹码管理平台

支持手机端和电脑网页端的线下德扑筹码管理工具。不需要带实体筹码，也不会搞错账。

## 功能

- **创建/加入房间** - 自定义昵称、emoji头像
- **房间设置** - SB/BB盲注、初始筹码、补码限额
- **12座位系统** - 选座、准备、自动开局
- **完整下注流程** - Fold / Check / Call / Raise / All-In
- **快捷加注** - 2BB / 1/2 Pot / Pot 及滑动条
- **状态机驱动** - Preflop → Flop → Turn → River → Showdown
- **街间暂停** - 等待线下发牌后手动推进
- **自动盲注** - 每手大小盲自动下注，按钮位自动轮转
- **底池管理** - 自动计算主池/边池
- **摊牌结算** - 支持单赢家、多人平分、主池/边池不同赢家
- **补码系统** - 筹码低于限额时可补码

## 快速启动（Docker Compose）

```bash
docker compose up --build -d
```

访问 http://localhost:3000

## 本地开发

### 后端
```bash
conda activate holdem
cd backend
pip install -r requirements.txt
# 需要先启动 Redis
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 前端
```bash
cd frontend
npm install
REACT_APP_API_URL=http://localhost:8000 REACT_APP_WS_URL=ws://localhost:8000 npm start
```

## 技术栈

- **前端**: React + TypeScript + TailwindCSS + Zustand
- **后端**: Python + FastAPI + WebSocket
- **存储**: Redis
- **部署**: Docker Compose + Nginx

## 项目结构

```
holdem/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py          # FastAPI 入口 + WebSocket
│       ├── models.py         # Pydantic 数据模型
│       ├── game_engine.py    # 游戏状态机 + 下注逻辑
│       ├── redis_manager.py  # Redis 持久化
│       └── ws_manager.py     # WebSocket 连接管理
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── App.tsx
        ├── api.ts            # API 调用
        ├── store.ts          # Zustand 状态管理
        ├── types.ts          # TypeScript 类型
        ├── pages/
        │   ├── HomePage.tsx   # 首页（创建/加入房间）
        │   └── RoomPage.tsx   # 房间页（游戏主页面）
        └── components/
            ├── SeatGrid.tsx        # 座位选择
            ├── PlayerCards.tsx      # 玩家信息卡片
            ├── ActionPanel.tsx      # 下注操作面板
            └── SettlementPanel.tsx  # 摊牌结算面板
```
