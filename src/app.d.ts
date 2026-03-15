declare global {
	namespace App {
		interface Locals {
			user: import('$lib/types').User | null;
			session: import('$lib/types').Session | null;
		}
	}
}

export {};
