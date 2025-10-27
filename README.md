# 🪑 5chairs Questionnaire - Portfolio Project

**Live Demo:** https://tg-questionnaire.netlify.app

Portfolio project based on real production work for Telegram dating service [5chairs](https://5chairs.app)

## Project Overview

This is a standalone, portfolio-ready version of the questionnaire that was originally part of the 5chairs Telegram dating service. The original production version was an active landing page for Instagram advertising, connecting real users to a Telegram bot via questionnaire completion.

### What Was This?

- **Production landing page** for Instagram ad campaigns
- **Real-time authentication** via Telegram Login API
- **Database integration** with PostgreSQL for question and answer storage
- **Telegram bot registration** - users were automatically registered in the bot after completing the questionnaire
- **User flow**: Instagram ads → Landing page → Questionnaire → Telegram auth → Bot registration

### Portfolio Version

This standalone version demonstrates the same design and animation work but uses demo data and localStorage for submission tracking. Perfect for showcasing the UX/UI work without external dependencies.

## Key Features

### ✨ Design & Animations

**Extensive design and animation work** went into creating a smooth, engaging user experience:

- **Interactive preloader** with animated chair sprites
- **Smooth page transitions** between questionnaire steps
- **Animated background** with dynamic line animations
- **Smart center positioning** for question cards on any screen size
- **Confetti celebration** effects on completion
- **Responsive design** across all devices
- **Modern UI** with gradient overlays and cell-pattern backgrounds

### 🎯 Functionality

- Multi-step questionnaire with progress tracking
- Form validation for all input types
- localStorage integration for offline persistence
- Smooth scrolling transitions
- Telegram Login integration (demo mode in portfolio version)
- UTM parameter tracking

## Technologies Used

- **HTML5** - Semantic markup and structure
- **CSS3** - Animations, transitions, responsive design
- **Vanilla JavaScript** - Module-based architecture, no frameworks
- **localStorage** - Client-side data persistence (portfolio version)
- **Vite** - Build tool and development server
- **Netlify** - Hosting and deployment
- **Git/GitHub** - Version control

## Project Structure

```
├── index.html              # Landing page
├── questionnaire.html      # Main questionnaire page
├── src/
│   ├── main.js            # App initialization and flow
│   ├── questionnaire.js   # Questionnaire manager
│   ├── api-client.js      # API client (demo mode for portfolio)
│   ├── animated-background.js  # Background animations
│   ├── telegram-auth.js   # Telegram authentication
│   └── style.css          # Main styles
├── public/                # Static assets (fonts, images)
├── _redirects             # Netlify redirects
├── netlify.toml           # Netlify configuration
└── README.md              # Documentation
```

## How It Worked in Production

### Original Setup (5chairs)

1. **Question Loading**: Questions fetched from PostgreSQL database
2. **User Journey**: Instagram ad → Landing → Questionnaire → Telegram Login
3. **Authentication**: Real Telegram OAuth with HMAC validation
4. **Data Submission**: Answers saved to PostgreSQL `user_answers` table
5. **Bot Registration**: User automatically registered in `@fivechairs_bot`
6. **Continuation**: User redirected to bot to complete onboarding

### Portfolio Version

- **Demo questions** loaded locally
- **Telegram auth** simulated (demo mode)
- **Submit** saves to localStorage instead of database
- **No bot registration** - standalone for portfolio display

## Design Highlights

### Animations
- **Preloader**: Animated chair sprites in sequence
- **Question transitions**: Smooth scroll-based transitions
- **Background**: Dynamic SVG line animations
- **Celebration**: Custom confetti effects
- **UI elements**: Hover states, button animations, loading states

### Responsive Design
- Mobile-first approach
- Smart center positioning for cards
- Adaptive font sizes
- Touch-friendly interactions
- Optimized for all screen sizes

## Deployment

The website is deployed on Netlify with automatic updates from the main branch.

**Live Demo:** https://tg-questionnaire.netlify.app

### Configuration

- Build command: `npm run build`
- Publish directory: `dist`
- SPA fallback configured
- Asset caching enabled

## Local Development

```bash
# Clone the repository
git clone https://github.com/kostyakunak/tg-quetionnaire.git

# Navigate to project
cd tg-quetionnaire

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Portfolio Notes

This project demonstrates:

- **UX Design** - Multi-step form design patterns
- **Animation Skills** - CSS and JavaScript animations
- **Production Experience** - Real-world database integration experience
- **Performance** - Optimized loading and responsive design
- **API Integration** - Telegram OAuth implementation (original)
- **Deployment** - Netlify configuration and hosting

## Original Context

**What was 5chairs?**
A Telegram-based dating service that used AI to match people for in-person meetups. Users would:
1. See Instagram ads for the service
2. Land on this questionnaire page
3. Complete questions about themselves
4. Authenticate via Telegram
5. Get matched by AI algorithm
6. Receive invitation to meet other matched users

This questionnaire was the entry point for the entire user journey from Instagram advertisement to real-world meetup.

## License

This project is for portfolio demonstration purposes. The original 5chairs service is a commercial product.

## Contact

For questions about this portfolio project, visit the [live demo](https://tg-questionnaire.netlify.app).
