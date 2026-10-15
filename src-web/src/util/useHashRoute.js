import {useCallback, useEffect, useState} from 'react';
import {getCurrentRoute, navigateTo} from './route.js';

// 订阅 hash 变化，返回当前路由与切换方法
export const useHashRoute = () => {
    const [route, setRoute] = useState(getCurrentRoute);

    useEffect(() => {
        const onHashChange = () => setRoute(getCurrentRoute());
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    const navigate = useCallback((next) => navigateTo(next), []);

    return [route, navigate];
};