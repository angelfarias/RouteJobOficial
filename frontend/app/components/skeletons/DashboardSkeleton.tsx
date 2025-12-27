"use client";

import { motion } from "framer-motion";

export default function DashboardSkeleton() {
    return (
        <div className="min-h-screen flex flex-col bg-white overflow-hidden">
            {/* Header Skeleton */}
            <div className="h-16 border-b border-zinc-100 bg-white/80 flex items-center justify-between px-6">
                <div className="w-32 h-8 bg-zinc-100 rounded-lg animate-pulse" />
                <div className="flex gap-4">
                    <div className="w-24 h-4 bg-zinc-100 rounded animate-pulse hidden md:block" />
                    <div className="w-24 h-4 bg-zinc-100 rounded animate-pulse hidden md:block" />
                    <div className="w-24 h-4 bg-zinc-100 rounded animate-pulse hidden md:block" />
                </div>
                <div className="flex gap-3">
                    <div className="w-8 h-8 bg-zinc-100 rounded-full animate-pulse" />
                    <div className="w-8 h-8 bg-zinc-100 rounded-full animate-pulse" />
                </div>
            </div>

            <div className="flex-1 mx-auto w-full max-w-7xl gap-6 px-4 pt-8 pb-10 flex">
                {/* Left Sidebar Skeleton */}
                <div className="hidden md:block w-full max-w-xs space-y-4">
                    <div className="h-64 rounded-2xl bg-zinc-50 border border-zinc-100 p-5 space-y-4">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-2xl bg-zinc-200 animate-pulse" />
                            <div className="space-y-2 w-full flex flex-col items-center">
                                <div className="w-3/4 h-4 bg-zinc-200 rounded animate-pulse" />
                                <div className="w-1/2 h-3 bg-zinc-100 rounded animate-pulse" />
                            </div>
                        </div>
                        <div className="w-full h-8 bg-zinc-100 rounded-xl animate-pulse mt-4" />
                        <div className="space-y-2 mt-4">
                            <div className="w-full h-3 bg-zinc-100 rounded animate-pulse" />
                            <div className="w-2/3 h-3 bg-zinc-100 rounded animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Main Content Skeleton */}
                <div className="flex-1 space-y-6">
                    {/* Hero/Search Skeleton */}
                    <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-6 space-y-4">
                        <div className="w-2/3 h-8 bg-zinc-200 rounded animate-pulse" />
                        <div className="w-1/2 h-4 bg-zinc-100 rounded animate-pulse" />
                        <div className="flex gap-3 mt-4">
                            <div className="flex-1 h-10 bg-zinc-200 rounded-xl animate-pulse" />
                            <div className="w-32 h-10 bg-zinc-200 rounded-xl animate-pulse hidden sm:block" />
                        </div>
                    </div>

                    {/* Banner Skeleton */}
                    <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 flex justify-between items-center">
                        <div className="space-y-2 w-2/3">
                            <div className="w-1/3 h-4 bg-zinc-200 rounded animate-pulse" />
                            <div className="w-full h-3 bg-zinc-100 rounded animate-pulse" />
                        </div>
                        <div className="w-24 h-8 bg-zinc-200 rounded-xl animate-pulse" />
                    </div>

                    {/* Jobs List Skeleton */}
                    <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm">
                        <div className="border-b border-zinc-100 px-4 py-3 flex gap-4">
                            <div className="w-24 h-6 bg-zinc-100 rounded animate-pulse" />
                            <div className="w-24 h-6 bg-zinc-100 rounded animate-pulse" />
                        </div>
                        <div className="divide-y divide-zinc-50">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="p-4 flex justify-between items-center">
                                    <div className="space-y-2 w-2/3">
                                        <div className="w-1/4 h-3 bg-zinc-100 rounded animate-pulse" />
                                        <div className="w-1/2 h-5 bg-zinc-200 rounded animate-pulse" />
                                        <div className="w-1/3 h-3 bg-zinc-100 rounded animate-pulse" />
                                    </div>
                                    <div className="w-24 h-8 bg-zinc-100 rounded-lg animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar Skeleton */}
                <div className="hidden lg:block w-72 space-y-4">
                    <div className="h-48 rounded-2xl bg-zinc-50 border border-zinc-100 p-4 space-y-4">
                        <div className="w-1/2 h-4 bg-zinc-200 rounded animate-pulse" />
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex justify-between">
                                    <div className="w-1/3 h-3 bg-zinc-100 rounded animate-pulse" />
                                    <div className="w-8 h-3 bg-zinc-200 rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="h-32 rounded-2xl bg-zinc-50 border border-zinc-100 p-4">
                        <div className="w-1/2 h-4 bg-zinc-200 rounded animate-pulse mb-2" />
                        <div className="w-full h-16 bg-zinc-100 rounded animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
}
