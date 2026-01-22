// Create a type for the roles
export type Roles = 'admin' | 'cyrail-user';

declare global {
    interface CustomJwtSessionClaims {
        metadata: {
            role?: Roles;
        };
    }
}
