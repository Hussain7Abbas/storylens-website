"use client";
import { UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { getMessages } from "@/i18n/messages";
import { getWebMe } from "@/lib/account/api";
import {
	ACCOUNT_CHANGED_EVENT,
	type HeaderAccount as Account,
	readHeaderAccount,
	writeHeaderAccount,
} from "@/lib/account/header-state";
import type { Locale } from "@/lib/site-config";

/**
 * "Sign in", or the reader's name once the website session is known. The link
 * keeps its width while it loads, so the static header does not shift.
 */
export function HeaderAccount({ locale }: { locale: Locale }) {
	const copy = getMessages(locale).account;
	const [account, setAccount] = useState<Account | null>(null);
	useEffect(() => {
		let active = true;
		const sync = () => {
			const cached = readHeaderAccount();
			if (cached) {
				setAccount(cached);
				return;
			}
			getWebMe(locale)
				.then((user) => {
					const next: Account = user
						? { signedIn: true, name: user.name || user.username }
						: { signedIn: false };
					writeHeaderAccount(next);
					if (active) setAccount(next);
				})
				.catch(() => active && setAccount({ signedIn: false }));
		};
		sync();
		window.addEventListener(ACCOUNT_CHANGED_EVENT, sync);
		return () => {
			active = false;
			window.removeEventListener(ACCOUNT_CHANGED_EVENT, sync);
		};
	}, [locale]);

	const signedIn = account?.signedIn === true;
	const label = signedIn
		? copy.headerAccount.replace("{name}", account.name)
		: copy.headerSignIn;
	return (
		<a
			className="header-account"
			href={`/${locale}/profile/${signedIn ? "" : "login/"}`}
			data-state={account ? "ready" : "loading"}
			aria-label={label}
			title={label}
		>
			<UserRound size={19} aria-hidden="true" strokeWidth={1.75} />
			<span className="header-account-text">
				{signedIn ? account.name : copy.headerSignIn}
			</span>
		</a>
	);
}
