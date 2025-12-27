"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    return (
        <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className="fixed bottom-20 left-5 z-[9999] flex h-12 w-12 items-center justify-center rounded-full bg-white/90 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-100 shadow-lg shadow-zinc-900/10 backdrop-blur-sm border border-zinc-200 dark:border-zinc-700 transition-colors"
            aria-label="Toggle theme"
        >
            <div className="relative h-6 w-6">
                <motion.div
                    initial={false}
                    animate={{
                        scale: theme === "dark" ? 0 : 1,
                        rotate: theme === "dark" ? 90 : 0,
                        opacity: theme === "dark" ? 0 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 flex items-center justify-center"
                >
                    <Sun className="h-6 w-6 text-amber-500" />
                </motion.div>
                <motion.div
                    initial={false}
                    animate={{
                        scale: theme === "dark" ? 1 : 0,
                        rotate: theme === "dark" ? 0 : -90,
                        opacity: theme === "dark" ? 1 : 0,
                    }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 flex items-center justify-center"
                >
                    <Moon className="h-6 w-6 text-blue-400" />
                </motion.div>
            </div>
        </motion.button>
    );
}
