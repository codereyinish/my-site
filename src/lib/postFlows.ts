// Maps a blog post (by its slug / collection id) to a FlowDiagram config so the
// post's card thumbnail can reuse the same animated diagram as the Projects section.
export interface PostFlow {
	title: string;
	caption: string;
	nodes: { label: string; icon: string; active?: boolean }[];
}

export const POST_FLOWS: Record<string, PostFlow> = {
	'i-built-my-own-vpn-here-s-how-you-can-build-your-own': {
		title: 'coldvpn · tunnel',
		caption: 'encrypted · WireGuard tunnel',
		nodes: [
			{ label: 'Mac', icon: 'laptop' },
			{ label: 'WireGuard', icon: 'shield' },
			{ label: 'Your Server', icon: 'server', active: true },
			{ label: 'Internet', icon: 'globe' },
		],
	},
};
