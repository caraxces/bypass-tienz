const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') {
        return null;
    }
    return localStorage.getItem('authToken');
};

const apiFetch = async (url: string, options: RequestInit = {}): Promise<any> => {
    const token = getAuthToken();
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        (headers as any)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { error: 'An unexpected error occurred.', status: response.status };
        }
        throw new Error(errorData.error || 'Request failed');
    }

    // Handle cases with no content
    if (response.status === 204) {
        return null;
    }

    return response.json();
};

export default apiFetch;
