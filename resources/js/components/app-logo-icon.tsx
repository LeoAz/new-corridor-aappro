import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<HTMLImageElement>) {
    return (
        <img
            src="/img/corridor.png"
            alt="Logo"
            {...props}
        />
    );
}
