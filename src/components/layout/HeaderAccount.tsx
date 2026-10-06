"use client";
import { UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { getMessages } from "@/i18n/messages";
import { getWebMe } from "@/lib/account/api";
import {
	ACCOUNT_CHANGED_EVENT,
	type HeaderAccount as Account,
	hasSessionHint,
	readHeaderAccount,
	writeHeaderAccount,
} from "@/lib/account/header-state";
import type { Locale } from "@/lib/site-config";

/**
 * "Sign in", or the reader's name once the website session is known. The link
 * keeps its width while it loads, so the static header does not shift. A
 * browser that has never signed in holds no session, so it reads "Sign in"
 * without calling the API: one less request per page, and no 401 in the
 * console of a first visit. The account pages set the hint when signing in.
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
			if (!hasSessionHint()) {
				setAccount({ signedIn: false });
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
