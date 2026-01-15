import { signIn, signUp, signOut, resetPassword, getCurrentSession, getCurrentUser } from '../auth';
import { supabase } from '../supabase';

// Type the mocked supabase
const mockedSupabase = supabase as jest.Mocked<typeof supabase>;

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    it('should return user and session on successful sign in', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123', user: mockUser };

      (mockedSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await signIn('test@example.com', 'password123');

      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
      expect(mockedSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should return error on failed sign in', async () => {
      (mockedSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });

      const result = await signIn('test@example.com', 'wrongpassword');

      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error).toEqual({ message: 'Invalid credentials' });
    });
  });

  describe('signUp', () => {
    it('should return user and session on successful sign up', async () => {
      const mockUser = { id: 'user-456', email: 'new@example.com' };
      const mockSession = { access_token: 'token-456', user: mockUser };

      (mockedSupabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await signUp('new@example.com', 'password123');

      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
    });

    it('should attempt sign in when no session returned (email confirmation)', async () => {
      const mockUser = { id: 'user-789', email: 'confirm@example.com' };

      // First call (signUp) returns user but no session
      (mockedSupabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser, session: null },
        error: null,
      });

      // Second call (signIn attempt) fails due to unconfirmed email
      (mockedSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Email not confirmed' },
      });

      const result = await signUp('confirm@example.com', 'password123');

      expect(result.user).toEqual(mockUser);
      expect(result.session).toBeNull();
      expect(result.error?.message).toContain('check your email');
    });

    it('should return error on failed sign up', async () => {
      (mockedSupabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Email already registered' },
      });

      const result = await signUp('existing@example.com', 'password123');

      expect(result.user).toBeNull();
      expect(result.error).toEqual({ message: 'Email already registered' });
    });
  });

  describe('signOut', () => {
    it('should return no error on successful sign out', async () => {
      (mockedSupabase.auth.signOut as jest.Mock).mockResolvedValueOnce({
        error: null,
      });

      const result = await signOut();

      expect(result.error).toBeNull();
      expect(mockedSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should return error on failed sign out', async () => {
      (mockedSupabase.auth.signOut as jest.Mock).mockResolvedValueOnce({
        error: { message: 'Sign out failed' },
      });

      const result = await signOut();

      expect(result.error).toEqual({ message: 'Sign out failed' });
    });
  });

  describe('resetPassword', () => {
    it('should return no error on successful password reset request', async () => {
      (mockedSupabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValueOnce({
        error: null,
      });

      const result = await resetPassword('test@example.com');

      expect(result.error).toBeNull();
      expect(mockedSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({ redirectTo: expect.any(String) })
      );
    });

    it('should return error if email not found', async () => {
      (mockedSupabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValueOnce({
        error: { message: 'User not found' },
      });

      const result = await resetPassword('nonexistent@example.com');

      expect(result.error).toEqual({ message: 'User not found' });
    });
  });

  describe('getCurrentSession', () => {
    it('should return session when authenticated', async () => {
      const mockSession = { access_token: 'token', user: { id: '123' } };

      (mockedSupabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: mockSession },
      });

      const session = await getCurrentSession();

      expect(session).toEqual(mockSession);
    });

    it('should return null when not authenticated', async () => {
      (mockedSupabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: null },
      });

      const session = await getCurrentSession();

      expect(session).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should return user when authenticated', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
      });

      const user = await getCurrentUser();

      expect(user).toEqual(mockUser);
    });

    it('should return null when not authenticated', async () => {
      (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: null },
      });

      const user = await getCurrentUser();

      expect(user).toBeNull();
    });
  });
});
