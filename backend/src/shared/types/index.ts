// Shared user type - used across all modules
export interface User {
    id: string;
    name: string;
    role: 'Ticketer' | 'Admin' | 'Passenger';
    walletBalance: number;
}
