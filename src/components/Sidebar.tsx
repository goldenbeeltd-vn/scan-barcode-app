"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, Plus, Scan, Ticket, History, ChevronRight } from "lucide-react";

import { OnlineIndicator } from "@/components/OnlineIndicator";
import { SyncStatus } from "@/components/SyncStatus";

const navItems = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/create", label: "Tạo vé", icon: Plus },
  { href: "/scan", label: "Quét vé", icon: Scan },
  { href: "/tickets", label: "Vé", icon: Ticket },
  { href: "/history", label: "Lịch sử", icon: History },
];

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 shadow-lg z-50 flex-col">
        {/* Logo/Brand */}
        <div className="flex items-center px-6 py-5 border-b border-gray-200">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <Image
                src="/images/logo.jpg"
                alt="Logo"
                width={40}
                height={40}
                className="rounded-lg shadow-sm group-hover:shadow-md transition-shadow"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                Ticket Scanner
              </h1>
              <p className="text-xs text-gray-500">Event Management</p>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-blue-50 text-blue-700 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-1.5 rounded-md ${
                        isActive
                          ? "bg-blue-100"
                          : "group-hover:bg-gray-200 transition-colors"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${
                          isActive ? "text-blue-600" : "text-gray-500"
                        }`}
                      />
                    </div>
                    <span className="truncate">{item.label}</span>
                  </div>
                  {isActive && (
                    <ChevronRight className="h-4 w-4 text-blue-400" />
                  )}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Status Indicators */}
        <div className="px-4 py-4 border-t border-gray-200 bg-gray-50/50">
          <div className="space-y-3">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Trạng thái
            </div>
            <OnlineIndicator />
            <SyncStatus />
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50 safe-area-inset-bottom">
        <div className="grid grid-cols-5 gap-1 px-1 py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "text-blue-600"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div
                  className={`p-1 rounded-md ${isActive ? "bg-blue-50" : ""}`}
                >
                  <Icon
                    className={`h-5 w-5 transition-transform ${
                      isActive ? "scale-110" : ""
                    }`}
                  />
                </div>
                <span
                  className={`text-xs mt-1 font-medium text-center leading-tight ${
                    isActive ? "text-blue-600" : ""
                  }`}
                >
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-blue-600 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
};
