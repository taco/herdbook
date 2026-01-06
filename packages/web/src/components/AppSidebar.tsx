import { useNavigate, useLocation } from 'react-router-dom';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    useSidebar,
} from '@/components/ui/sidebar';
import { LayoutDashboard, LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface NavItem {
    id: string;
    title: string;
    to: string;
    icon: React.ElementType;
}

interface NavSection {
    id: string;
    label: string;
    items: NavItem[];
}

const NAV_CONFIG: NavSection[] = [
    {
        id: 'main',
        label: 'Navigation',
        items: [
            {
                id: 'dashboard',
                title: 'Dashboard',
                to: '/',
                icon: LayoutDashboard,
            },
        ],
    },
    {
        id: 'account',
        label: 'Account',
        items: [
            {
                id: 'profile',
                title: 'Profile',
                to: '/profile',
                icon: User,
            },
            {
                id: 'settings',
                title: 'Settings',
                to: '/settings',
                icon: Settings,
            },
        ],
    },
];

export function AppSidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { riderName } = useAuth();
    const { setOpenMobile } = useSidebar();

    const handleNavigate = (to: string) => {
        navigate(to);
        setOpenMobile(false);
    };

    return (
        <Sidebar side="left" variant="sidebar" collapsible="offcanvas">
            <SidebarHeader className="border-b p-4">
                <div className="flex flex-col">
                    <span className="font-semibold">Herdbook</span>
                    <span className="text-xs text-muted-foreground">
                        {riderName}
                    </span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                {NAV_CONFIG.map((section) => (
                    <SidebarGroup key={section.id}>
                        <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {section.items.map((item) => (
                                    <SidebarMenuItem key={item.id}>
                                        <SidebarMenuButton
                                            isActive={
                                                location.pathname === item.to
                                            }
                                            onClick={() =>
                                                handleNavigate(item.to)
                                            }
                                            tooltip={item.title}
                                        >
                                            <item.icon className="mr-2 h-4 w-4" />
                                            <span>{item.title}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>
            <SidebarFooter className="border-t p-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={() => handleNavigate('/logout')}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Logout</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
