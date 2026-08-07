import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex items-center justify-center rounded-md">
                <AppLogoIcon className="h-8 w-auto" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    Corridor Appro
                </span>
            </div>
        </>
    );
}
