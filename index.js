const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting to prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', limiter);

// In-memory storage for bookings (in production, use a database)
let bookings = [];
let nextBookingId = 1;

// API Routes for hotel booking
app.get('/api/rooms', (req, res) => {
    const rooms = [
        {
            id: 1,
            type: 'Standard Room',
            price: 100,
            capacity: 2,
            amenities: ['Free WiFi', 'TV', 'Air Conditioning'],
            available: true
        },
        {
            id: 2,
            type: 'Deluxe Room',
            price: 150,
            capacity: 3,
            amenities: ['Free WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'City View'],
            available: true
        },
        {
            id: 3,
            type: 'Suite',
            price: 250,
            capacity: 4,
            amenities: ['Free WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'Ocean View', 'Jacuzzi'],
            available: true
        },
        {
            id: 4,
            type: 'Presidential Suite',
            price: 500,
            capacity: 6,
            amenities: ['Free WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'Ocean View', 'Jacuzzi', 'Butler Service', 'Private Pool'],
            available: true
        }
    ];
    res.json(rooms);
});

// Create a new booking
app.post('/api/bookings', (req, res) => {
    const { guestName, email, phone, roomId, checkIn, checkOut, guests } = req.body;
    
    // Validation
    if (!guestName || !email || !phone || !roomId || !checkIn || !checkOut || !guests) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Validate dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (checkInDate < today) {
        return res.status(400).json({ error: 'Check-in date cannot be in the past' });
    }
    
    if (checkOutDate <= checkInDate) {
        return res.status(400).json({ error: 'Check-out date must be after check-in date' });
    }
    
    // Check if room is available for the selected dates
    const existingBookings = bookings.filter(booking => booking.roomId === roomId);
    const isDateConflict = existingBookings.some(booking => {
        const existingCheckIn = new Date(booking.checkIn);
        const existingCheckOut = new Date(booking.checkOut);
        return (checkInDate < existingCheckOut && checkOutDate > existingCheckIn);
    });
    
    if (isDateConflict) {
        return res.status(409).json({ error: 'Room is not available for the selected dates' });
    }
    
    const newBooking = {
        id: nextBookingId++,
        guestName,
        email,
        phone,
        roomId: parseInt(roomId),
        checkIn,
        checkOut,
        guests: parseInt(guests),
        bookingDate: new Date().toISOString(),
        status: 'confirmed'
    };
    
    bookings.push(newBooking);
    res.status(201).json({ 
        message: 'Booking confirmed successfully!',
        booking: newBooking
    });
});

// Get all bookings (for admin purposes)
app.get('/api/bookings', (req, res) => {
    res.json(bookings);
});

// Get booking by ID
app.get('/api/bookings/:id', (req, res) => {
    const booking = bookings.find(b => b.id === parseInt(req.params.id));
    if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(booking);
});

// Cancel a booking
app.delete('/api/bookings/:id', (req, res) => {
    const bookingIndex = bookings.findIndex(b => b.id === parseInt(req.params.id));
    if (bookingIndex === -1) {
        return res.status(404).json({ error: 'Booking not found' });
    }
    
    bookings.splice(bookingIndex, 1);
    res.json({ message: 'Booking cancelled successfully' });
});

// Root endpoint - returns API info instead of HTML
app.get('/', (req, res) => {
    res.json({
        name: 'Hotel Booking API',
        version: '1.0.0',
        endpoints: {
            rooms: '/api/rooms',
            bookings: '/api/bookings',
            createBooking: 'POST /api/bookings',
            getBooking: 'GET /api/bookings/:id',
            cancelBooking: 'DELETE /api/bookings/:id'
        },
        message: 'Hotel booking API is running. Use the endpoints above to interact with the system.'
    });
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle 404 - Keep this as the last route
app.use((req, res) => {
    // Check if the request accepts JSON
    if (req.accepts('json')) {
        res.status(404).json({ error: 'API endpoint not found' });
    } else {
        // Try to serve 404.html, if it exists
        const indexPath = path.join(__dirname, 'public', '404.html');
        res.status(404).sendFile(indexPath, (err) => {
            if (err) {
                res.status(404).send('404 - Page Not Found');
            }
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    if (req.accepts('json')) {
        res.status(500).json({ error: 'Something went wrong!' });
    } else {
        res.status(500).send('Something went wrong!');
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🏨 Hotel Booking API running at http://localhost:${PORT}`);
    console.log(`📋 Available API Endpoints:`);
    console.log(`   GET    http://localhost:${PORT}/api/rooms     - View available rooms`);
    console.log(`   GET    http://localhost:${PORT}/api/bookings  - View all bookings`);
    console.log(`   POST   http://localhost:${PORT}/api/bookings  - Create a new booking`);
    console.log(`   GET    http://localhost:${PORT}/api/bookings/:id - Get booking details`);
    console.log(`   DELETE http://localhost:${PORT}/api/bookings/:id - Cancel a booking`);
    console.log(`\n📁 Static files served from /public directory`);
});
