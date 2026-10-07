import { useAuthStore } from '@/stores/auth-store';

type ApiFetchOptions = {
    ignoreUnauthorized?: boolean;
};

export async function apiFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
    options?: ApiFetchOptions
): Promise<Response> {
    const response = await fetch(input, init);

    const { token, isLoggingOut } = useAuthStore.getState();
    if (
        response.status === 401 &&
        token &&
        !isLoggingOut &&
        !options?.ignoreUnauthorized
    ) {
        void useAuthStore.getState().expireSession();
    }

    return response;
}
