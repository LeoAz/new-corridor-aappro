import { Link } from '@inertiajs/react';
import {
    Package,
    Settings,
    Truck,
    Users,
    LayoutDashboard,
    FileText,
    BarChart3,
    Fuel,
    Receipt,
    Files,
    CreditCard,
    ClipboardCheck,
    BarChartHorizontal,
    Contact,
    MapPin,
} from 'lucide-react';

import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import * as configuration from '@/routes/configuration';
import * as finances from '@/routes/finances';
import * as operations from '@/routes/operations';
import * as rapports from '@/routes/rapports';
import type { NavGroup, NavItem } from '@/types';

const mainNavGroups: NavGroup[] = [
    {
        title: 'Opérations',
        items: [
            {
                title: 'Chargements',
                href: operations.default.chargements.index().url,
                icon: Package,
            },
            {
                title: 'Livraisons',
                href: operations.default.livraisons.index().url,
                icon: Truck,
            },
            {
                title: 'Suivi stock',
                href: '/stocks/suivi-stock',
                icon: LayoutDashboard,
            },
        ],
    },
    {
        title: 'Finances',
        items: [
            {
                title: 'Achat de carburant',
                href: finances.default.achatCarburant.index().url,
                icon: Fuel,
            },
            {
                title: 'Facture chargement',
                href: finances.default.factureChargement.index().url,
                icon: Receipt,
            },
            {
                title: 'Facture dépôt',
                href: finances.default.factureDepots.index().url,
                icon: Files,
            },
            {
                title: 'Règlements',
                href: finances.default.reglements.index().url,
                icon: CreditCard,
            },
        ],
    },
    {
        title: 'Rapports',
        items: [
            {
                title: 'Chargements',
                href: rapports.default.chargements().url,
                icon: FileText,
            },
            {
                title: 'Livraisons',
                href: rapports.default.livraisons().url,
                icon: ClipboardCheck,
            },
            {
                title: 'Vente chargement',
                href: rapports.default.venteChargement().url,
                icon: BarChartHorizontal,
            },
            {
                title: 'Vente dépôt',
                href: rapports.default.venteDepot().url,
                icon: BarChart3,
            },
        ],
    },
    {
        title: 'Clients',
        items: [
            {
                title: 'Gestion des clients',
                href: '/clients/gestion',
                icon: Contact,
            },
            {
                title: 'Relevé de compte',
                href: '/clients/releve',
                icon: FileText,
            },
            {
                title: 'Suivi client',
                href: '/clients/suivi-client',
                icon: Users,
            },
        ],
    },
    {
        title: 'Configuration',
        items: [
            {
                title: 'Dépôts',
                href: configuration.default.depots.index().url,
                icon: Settings,
            },
            {
                title: 'Villes',
                href: '/settings/cities',
                icon: MapPin,
            },
        ],
    },
];

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={operations.default.chargements.index().url} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain groups={mainNavGroups} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
