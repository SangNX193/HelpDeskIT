function useApi(path, initialValue) {
    const [data, setData] = React.useState(initialValue);
    const [loading, setLoading] = React.useState(true);
    const toast = useToast();

    const load = React.useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get(path);
            setData(response.data.data);
        } catch (error) {
            toast(errorMessage(error), "error");
        } finally {
            setLoading(false);
        }
    }, [path]);

    React.useEffect(() => {
        load();
    }, [load]);

    return { data, setData, loading, refresh: load };
}
