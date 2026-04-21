# Security Specification - InvestimPix

## Data Invariants
1. A user can only read and write their own profile (`/users/{uid}`).
2. Balance and totalInvested are critical fields; during creation, they must be set to 0. During updates, they must only change via specific transaction-triggered logic (simulated in UI but rules will enforce that only the owner can update).
3. Investments and Transactions are nested under the user ID, ensuring natural isolation.
4. `amount` in transactions and investments must always be positive.
5. `pixKey` in transaction must match a specific format (simulated).

## The Dirty Dozen Payloads (Rejection Targets)
1. **Identity Theft**: User A tries to read `/users/UserB`.
2. **Infinite Balance**: User A tries to update their balance to 999999999 directly.
3. **Ghost Investment**: Setting `amount` to -500 to "withdraw" funds illicitly.
4. **Shadow Field**: Adding a `role: 'admin'` field to the user profile.
5. **Orphan Transaction**: Creating a transaction with an invalid timestamp.
6. **Data Poisoning**: Setting `name` to a 2MB string.
7. **Identity Spoofing**: Creating an investment for another user.
8. **Invalid Portfolio**: Using a non-alphanumeric `portfolioId`.
9. **Terminal State Bypass**: Updating a 'completed' transaction back to 'pending'.
10. **Unauthenticated Write**: Trying to create a user profile without being signed in.
11. **Email Spoofing**: Accessing data without a verified email (requirement for this fintech app).
12. **Future Transaction**: Setting a timestamp in the year 2099.

## Verification
Rules will be implemented in `firestore.rules` and tested via logic analysis.
