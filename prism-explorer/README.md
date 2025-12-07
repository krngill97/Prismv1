# PRISM Block Explorer

A modern, glassmorphism-styled blockchain explorer for the PRISM network built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- 🎨 **Glassmorphism Design** - Beautiful, modern UI with glass-effect components
- 🔍 **Real-time Search** - Search by block number, transaction hash, or address
- 📊 **Live Statistics** - Network stats, block metrics, and transaction analytics
- 🧱 **Block Explorer** - Browse and view detailed information about blocks
- 💸 **Transaction Tracking** - View transaction details, status, and history
- 👤 **Address Analytics** - Track balances, transactions, and activity for any address
- ⚡ **Fast & Responsive** - Built with Next.js 14 App Router for optimal performance
- 🎨 **Rainbow Gradient** - PRISM-themed color palette throughout the UI

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Date Handling**: date-fns

## Prerequisites

- Node.js 18+ installed
- PRISM blockchain node running with RPC enabled
- npm or yarn package manager

## Installation

1. **Clone or navigate to the project**:
```bash
cd prism-explorer
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment variables**:
```bash
cp .env.example .env.local
```

Edit `.env.local` and set your RPC URL:
```env
NEXT_PUBLIC_RPC_URL=http://localhost:9001
```

4. **Run the development server**:
```bash
npm run dev
```

5. **Open your browser**:
Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Starting the Explorer

**Development mode**:
```bash
npm run dev
```

**Production build**:
```bash
npm run build
npm start
```

### Connecting to PRISM Blockchain

Make sure your PRISM blockchain validator is running with RPC enabled:

```bash
# Start a PRISM validator (from prism-blockchain directory)
npm run validator1
```

The RPC server should be accessible at `http://localhost:9001` by default.

### Searching

Use the search bar on the homepage to find:
- **Blocks**: Enter a block number (e.g., `42`)
- **Transactions**: Enter a transaction hash (e.g., `0xabc123...`)
- **Addresses**: Enter an address (e.g., `0x1234...`)

## Project Structure

```
prism-explorer/
├── app/
│   ├── layout.tsx           # Root layout with navigation
│   ├── page.tsx             # Homepage with search and stats
│   ├── globals.css          # Global styles and glassmorphism
│   ├── blocks/
│   │   └── page.tsx         # All blocks page
│   ├── transactions/
│   │   └── page.tsx         # All transactions page
│   ├── block/
│   │   └── [number]/
│   │       └── page.tsx     # Block detail page
│   ├── tx/
│   │   └── [hash]/
│   │       └── page.tsx     # Transaction detail page
│   └── address/
│       └── [address]/
│           └── page.tsx     # Address detail page
├── components/
│   ├── Navigation.tsx       # Top navigation bar
│   ├── Footer.tsx           # Footer component
│   ├── GlassCard.tsx        # Glassmorphism card component
│   ├── StatCard.tsx         # Statistics card component
│   ├── SearchBar.tsx        # Search functionality
│   ├── BlockList.tsx        # Block list display
│   └── TransactionList.tsx  # Transaction list display
├── lib/
│   ├── api.ts               # RPC API client
│   └── utils.ts             # Utility functions
└── public/                  # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Design System

### Colors (PRISM Rainbow)

- Red: `#FF0000`
- Orange: `#FF7F00`
- Yellow: `#FFFF00`
- Green: `#00FF00`
- Blue: `#0000FF`
- Indigo: `#4B0082`
- Violet: `#9400D3`

### Glassmorphism Classes

- `.glass-card` - Main glass card effect
- `.glass-button` - Glass-styled button
- `.glass-input` - Glass-styled input field
- `.text-gradient` - Rainbow gradient text
- `.prism-gradient` - Full PRISM rainbow gradient

## API Integration

The explorer connects to the PRISM blockchain via JSON-RPC 2.0:

- `getLatestBlock()` - Get the latest block
- `getBlock(number)` - Get block by number
- `getTransaction(hash)` - Get transaction by hash
- `getAccount(address)` - Get account information
- `getBalance(address)` - Get account balance
- `getBlockchain()` - Get entire blockchain
- `getNetworkStats()` - Get network statistics

## Features Overview

### Homepage
- Network statistics dashboard
- Search functionality
- Latest blocks preview
- Latest transactions preview

### Blocks Page
- Complete list of all blocks
- Block metrics and statistics
- Sortable and filterable views

### Transactions Page
- All transactions (pending and confirmed)
- Transaction status indicators
- Filter by status

### Block Detail Page
- Complete block information
- Block hash and previous hash
- Validator information
- All transactions in the block
- Navigation to previous/next blocks

### Transaction Detail Page
- Transaction hash and status
- From/To addresses
- Amount and fees
- Block confirmation
- Signature details

### Address Detail Page
- Account balance
- Transaction history
- Send/Receive statistics
- Total volume metrics

## Customization

### Changing RPC Endpoint

Edit `.env.local`:
```env
NEXT_PUBLIC_RPC_URL=http://your-rpc-server:port
```

### Theme Customization

Edit `tailwind.config.ts` to customize colors, fonts, and other design tokens.

### Adding New Features

1. Create new components in `components/`
2. Add new pages in `app/`
3. Extend API client in `lib/api.ts`
4. Add utility functions in `lib/utils.ts`

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Set environment variables
4. Deploy

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for any purpose.

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check existing documentation
- Review the code comments

## Acknowledgments

- Built with Next.js 14
- Styled with Tailwind CSS
- Icons by Lucide
- Inspired by modern blockchain explorers

---

**Made with 💎 for the PRISM blockchain**
