import {CustomizableSelect, type CustomizableSelectOption, type ThemeMode} from '../lib/index.ts';
import '../styles/index.css';
import './demo-shell.css';

type Framework = {readonly family: string};

const OPTIONS: readonly CustomizableSelectOption<Framework>[] = [
	{id: 'typescript', text: 'TypeScript', data: {family: 'Language'}},
	{id: 'react', text: 'React', data: {family: 'UI'}},
	{id: 'vue', text: 'Vue', data: {family: 'UI'}},
	{id: 'svelte', text: 'Svelte', data: {family: 'UI'}},
	{id: 'lit', text: 'Lit', data: {family: 'Web Components'}},
	{id: 'legacy', text: 'Required legacy integration', locked: true, data: {family: 'Platform'}},
];

function appendEventLog(message: string): void {
	const log = document.querySelector<HTMLTextAreaElement>('#event-log');
	if (log === null) {
		return;
	}
	const timestamp = new Date().toISOString().slice(11, 19);
	log.value = `${log.value}${log.value.length > 0 ? '\n' : ''}[${timestamp}] ${message}`;
	log.scrollTop = log.scrollHeight;
}

function mountSelect(): CustomizableSelect<Framework> {
	const source = document.querySelector<HTMLSelectElement>('#customizable-select-source');
	if (source === null) {
		throw new Error('Missing #customizable-select-source');
	}
	const instance = new CustomizableSelect(source, {
		options: OPTIONS,
		multiple: true,
		placeholder: 'Choose technologies',
		renderOption: ({option}): string => `${option.text} · ${option.data?.family ?? 'Other'}`,
	});
	instance.setValue(['legacy', 'typescript', 'react']);
	instance.addEventListener('customizable-select:change', ({detail}) => {
		appendEventLog(`change | values=${detail.values.join(',') || '(empty)'} | user=${String(detail.userInitiated)}`);
	});
	return instance;
}

function init(): void {
	let instance = mountSelect();
	let disabled = false;
	let darkTheme = false;
	appendEventLog('demo initialized');

	document.querySelector<HTMLButtonElement>('#reset-btn')?.addEventListener('click', () => {
		instance.destroy();
		instance = mountSelect();
		disabled = false;
		appendEventLog('reset');
	});

	const disableButton = document.querySelector<HTMLButtonElement>('#disable-btn');
	disableButton?.addEventListener('click', () => {
		disabled = !disabled;
		instance.setDisabled(disabled);
		disableButton.textContent = disabled ? 'Enable' : 'Disable';
		disableButton.setAttribute('aria-pressed', String(disabled));
		appendEventLog(`disabled=${String(disabled)}`);
	});

	const themeButton = document.querySelector<HTMLButtonElement>('#theme-btn');
	themeButton?.addEventListener('click', () => {
		darkTheme = !darkTheme;
		const theme: ThemeMode = darkTheme ? 'dark' : 'light';
		document.documentElement.dataset['theme'] = theme;
		instance.setTheme(theme);
		themeButton.textContent = darkTheme ? 'Light Theme' : 'Dark Theme';
		themeButton.setAttribute('aria-pressed', String(darkTheme));
		appendEventLog(`theme=${theme}`);
	});
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}
