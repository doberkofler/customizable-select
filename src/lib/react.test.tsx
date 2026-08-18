import {act, createElement, createRef} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {CustomizableSelect, type CustomizableSelectReactProps} from './react.tsx';
import {type CustomizableSelect as NativeCustomizableSelect, type CustomizableSelectChangeDetail, type CustomizableSelectOption} from './widget.ts';

const OPTIONS: readonly CustomizableSelectOption[] = [
	{id: 'alpha', text: 'Alpha'},
	{id: 'beta', text: 'Beta'},
];

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function renderComponent(props: Partial<CustomizableSelectReactProps> = {}): void {
	if (container === null) {
		container = document.createElement('div');
		document.body.append(container);
		root = createRoot(container);
	}
	act(() => {
		root?.render(createElement(CustomizableSelect, {options: OPTIONS, ...props}));
	});
}

describe('CustomizableSelect React adapter', () => {
	afterEach(() => {
		act(() => {
			root?.unmount();
		});
		container?.remove();
		container = null;
		root = null;
	});

	it('renders an uncontrolled native component', () => {
		renderComponent({defaultValue: 'beta', name: 'category', required: true});

		expect(document.querySelector<HTMLSelectElement>('select')?.name).toBe('category');
		expect(document.querySelector<HTMLSelectElement>('select')?.required).toBe(true);
		expect(document.querySelector('.customizable-select__value')?.textContent).toBe('Beta');
	});

	it('synchronizes controlled values and options', () => {
		renderComponent({value: 'alpha'});
		renderComponent({value: 'beta', options: [...OPTIONS, {id: 'gamma', text: 'Gamma'}]});

		expect(document.querySelector('.customizable-select__value')?.textContent).toBe('Beta');
		expect(document.querySelectorAll('.customizable-select__option')).toHaveLength(3);
	});

	it('applies an unchanged controlled value after its option loads', () => {
		renderComponent({value: 'remote', options: OPTIONS});
		expect(document.querySelector('.customizable-select__value')).toBeNull();

		renderComponent({value: 'remote', options: [...OPTIONS, {id: 'remote', text: 'Remote'}]});

		expect(document.querySelector('.customizable-select__value')?.textContent).toBe('Remote');
	});

	it('restores a rejected user change to the controlled value', async () => {
		const onValueChange = vi.fn<(detail: CustomizableSelectChangeDetail) => void>();
		renderComponent({value: 'alpha', onValueChange});
		document.querySelector<HTMLDivElement>('.customizable-select__selection')?.click();
		document.querySelector<HTMLElement>('[data-option-id="beta"]')?.click();

		await vi.waitFor(() => {
			expect(document.querySelector('.customizable-select__value')?.textContent).toBe('Alpha');
		});
		expect(onValueChange).toHaveBeenCalledWith(expect.objectContaining({value: 'beta'}));
	});

	it('reports user changes through the latest callback', () => {
		const first = vi.fn<(detail: CustomizableSelectChangeDetail) => void>();
		const second = vi.fn<(detail: CustomizableSelectChangeDetail) => void>();
		renderComponent({
			onValueChange: (detail) => {
				first(detail);
			},
		});
		renderComponent({
			onValueChange: (detail) => {
				second(detail);
			},
		});
		document.querySelector<HTMLDivElement>('.customizable-select__selection')?.click();
		document.querySelector<HTMLElement>('[data-option-id="beta"]')?.click();

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledWith(expect.objectContaining({value: 'beta', userInitiated: true}));
	});

	it('exposes and clears the native instance ref', () => {
		const ref = createRef<NativeCustomizableSelect | null>();
		renderComponent({ref} as Partial<CustomizableSelectReactProps>);

		expect(ref.current?.element.classList.contains('customizable-select')).toBe(true);
		act(() => {
			root?.unmount();
		});
		expect(ref.current).toBeNull();
	});

	it('updates the forwarded ref without recreating the native instance', () => {
		const firstRef = createRef<NativeCustomizableSelect | null>();
		const secondRef = createRef<NativeCustomizableSelect | null>();
		renderComponent({ref: firstRef} as Partial<CustomizableSelectReactProps>);
		const instance = firstRef.current;

		renderComponent({ref: secondRef} as Partial<CustomizableSelectReactProps>);

		expect(firstRef.current).toBeNull();
		expect(secondRef.current).toBe(instance);
	});

	it('uses current initialization props when replacing the source element', () => {
		const ref = createRef<NativeCustomizableSelect | null>();
		renderComponent({ref, searchable: true} as Partial<CustomizableSelectReactProps>);
		const selectInstance = ref.current;

		renderComponent({ref, searchable: false, sourceElement: 'input'} as Partial<CustomizableSelectReactProps>);

		expect(document.querySelector('select')).toBeNull();
		expect(document.querySelector('input.customizable-select__source')).not.toBeNull();
		expect(document.querySelector<HTMLInputElement>('.customizable-select__search')?.hidden).toBe(true);
		expect(ref.current).not.toBe(selectInstance);
	});
});
