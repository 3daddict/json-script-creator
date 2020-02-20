
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.18.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/UI/Card.svelte generated by Svelte v3.18.2 */

    const file = "src/UI/Card.svelte";

    function create_fragment(ctx) {
    	let div3;
    	let div2;
    	let div0;
    	let span;
    	let t0;
    	let t1;
    	let ul;
    	let li0;
    	let t2;
    	let t3;
    	let t4;
    	let li1;
    	let t5;
    	let t6;
    	let t7;
    	let li2;
    	let t8;
    	let t9;
    	let t10;
    	let li3;
    	let t11;
    	let t12;
    	let t13;
    	let li4;
    	let t14;
    	let t15;
    	let t16;
    	let div1;
    	let a0;
    	let t18;
    	let a1;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			span = element("span");
    			t0 = text(/*cardTitle*/ ctx[0]);
    			t1 = space();
    			ul = element("ul");
    			li0 = element("li");
    			t2 = text("Carrier Code: ");
    			t3 = text(/*carrierCode*/ ctx[1]);
    			t4 = space();
    			li1 = element("li");
    			t5 = text("Delay: ");
    			t6 = text(/*delay*/ ctx[2]);
    			t7 = space();
    			li2 = element("li");
    			t8 = text("Delay End: ");
    			t9 = text(/*delayEnd*/ ctx[3]);
    			t10 = space();
    			li3 = element("li");
    			t11 = text("Delay Show: ");
    			t12 = text(/*dateShow*/ ctx[4]);
    			t13 = space();
    			li4 = element("li");
    			t14 = text("Delay Hide: ");
    			t15 = text(/*dateHide*/ ctx[5]);
    			t16 = space();
    			div1 = element("div");
    			a0 = element("a");
    			a0.textContent = "Edit";
    			t18 = space();
    			a1 = element("a");
    			a1.textContent = "Delete";
    			attr_dev(span, "class", "card-title");
    			add_location(span, file, 13, 16, 283);
    			attr_dev(li0, "class", "list-group-item");
    			add_location(li0, file, 15, 20, 368);
    			attr_dev(li1, "class", "list-group-item");
    			add_location(li1, file, 16, 20, 449);
    			attr_dev(li2, "class", "list-group-item");
    			add_location(li2, file, 17, 20, 517);
    			attr_dev(li3, "class", "list-group-item");
    			add_location(li3, file, 18, 20, 592);
    			attr_dev(li4, "class", "list-group-item");
    			add_location(li4, file, 19, 20, 668);
    			add_location(ul, file, 14, 16, 343);
    			attr_dev(div0, "class", "card-content");
    			add_location(div0, file, 12, 12, 240);
    			attr_dev(a0, "href", "/edit");
    			add_location(a0, file, 23, 16, 819);
    			attr_dev(a1, "href", "/delete");
    			add_location(a1, file, 24, 16, 860);
    			attr_dev(div1, "class", "card-action");
    			add_location(div1, file, 22, 12, 777);
    			attr_dev(div2, "class", "card");
    			add_location(div2, file, 11, 8, 209);
    			attr_dev(div3, "class", "col s12 m6");
    			add_location(div3, file, 10, 4, 176);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, span);
    			append_dev(span, t0);
    			append_dev(div0, t1);
    			append_dev(div0, ul);
    			append_dev(ul, li0);
    			append_dev(li0, t2);
    			append_dev(li0, t3);
    			append_dev(ul, t4);
    			append_dev(ul, li1);
    			append_dev(li1, t5);
    			append_dev(li1, t6);
    			append_dev(ul, t7);
    			append_dev(ul, li2);
    			append_dev(li2, t8);
    			append_dev(li2, t9);
    			append_dev(ul, t10);
    			append_dev(ul, li3);
    			append_dev(li3, t11);
    			append_dev(li3, t12);
    			append_dev(ul, t13);
    			append_dev(ul, li4);
    			append_dev(li4, t14);
    			append_dev(li4, t15);
    			append_dev(div2, t16);
    			append_dev(div2, div1);
    			append_dev(div1, a0);
    			append_dev(div1, t18);
    			append_dev(div1, a1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*cardTitle*/ 1) set_data_dev(t0, /*cardTitle*/ ctx[0]);
    			if (dirty & /*carrierCode*/ 2) set_data_dev(t3, /*carrierCode*/ ctx[1]);
    			if (dirty & /*delay*/ 4) set_data_dev(t6, /*delay*/ ctx[2]);
    			if (dirty & /*delayEnd*/ 8) set_data_dev(t9, /*delayEnd*/ ctx[3]);
    			if (dirty & /*dateShow*/ 16) set_data_dev(t12, /*dateShow*/ ctx[4]);
    			if (dirty & /*dateHide*/ 32) set_data_dev(t15, /*dateHide*/ ctx[5]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { cardTitle } = $$props;
    	let { carrierCode } = $$props;
    	let { delay } = $$props;
    	let { delayEnd } = $$props;
    	let { dateShow } = $$props;
    	let { dateHide } = $$props;
    	const writable_props = ["cardTitle", "carrierCode", "delay", "delayEnd", "dateShow", "dateHide"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Card> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("cardTitle" in $$props) $$invalidate(0, cardTitle = $$props.cardTitle);
    		if ("carrierCode" in $$props) $$invalidate(1, carrierCode = $$props.carrierCode);
    		if ("delay" in $$props) $$invalidate(2, delay = $$props.delay);
    		if ("delayEnd" in $$props) $$invalidate(3, delayEnd = $$props.delayEnd);
    		if ("dateShow" in $$props) $$invalidate(4, dateShow = $$props.dateShow);
    		if ("dateHide" in $$props) $$invalidate(5, dateHide = $$props.dateHide);
    	};

    	$$self.$capture_state = () => {
    		return {
    			cardTitle,
    			carrierCode,
    			delay,
    			delayEnd,
    			dateShow,
    			dateHide
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("cardTitle" in $$props) $$invalidate(0, cardTitle = $$props.cardTitle);
    		if ("carrierCode" in $$props) $$invalidate(1, carrierCode = $$props.carrierCode);
    		if ("delay" in $$props) $$invalidate(2, delay = $$props.delay);
    		if ("delayEnd" in $$props) $$invalidate(3, delayEnd = $$props.delayEnd);
    		if ("dateShow" in $$props) $$invalidate(4, dateShow = $$props.dateShow);
    		if ("dateHide" in $$props) $$invalidate(5, dateHide = $$props.dateHide);
    	};

    	return [cardTitle, carrierCode, delay, delayEnd, dateShow, dateHide];
    }

    class Card extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			cardTitle: 0,
    			carrierCode: 1,
    			delay: 2,
    			delayEnd: 3,
    			dateShow: 4,
    			dateHide: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Card",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*cardTitle*/ ctx[0] === undefined && !("cardTitle" in props)) {
    			console.warn("<Card> was created without expected prop 'cardTitle'");
    		}

    		if (/*carrierCode*/ ctx[1] === undefined && !("carrierCode" in props)) {
    			console.warn("<Card> was created without expected prop 'carrierCode'");
    		}

    		if (/*delay*/ ctx[2] === undefined && !("delay" in props)) {
    			console.warn("<Card> was created without expected prop 'delay'");
    		}

    		if (/*delayEnd*/ ctx[3] === undefined && !("delayEnd" in props)) {
    			console.warn("<Card> was created without expected prop 'delayEnd'");
    		}

    		if (/*dateShow*/ ctx[4] === undefined && !("dateShow" in props)) {
    			console.warn("<Card> was created without expected prop 'dateShow'");
    		}

    		if (/*dateHide*/ ctx[5] === undefined && !("dateHide" in props)) {
    			console.warn("<Card> was created without expected prop 'dateHide'");
    		}
    	}

    	get cardTitle() {
    		throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set cardTitle(value) {
    		throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get carrierCode() {
    		throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set carrierCode(value) {
    		throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get delay() {
    		throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set delay(value) {
    		throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get delayEnd() {
    		throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set delayEnd(value) {
    		throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get dateShow() {
    		throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set dateShow(value) {
    		throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get dateHide() {
    		throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set dateHide(value) {
    		throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/CardGrid.svelte generated by Svelte v3.18.2 */
    const file$1 = "src/components/CardGrid.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (12:0) {#each cards as card}
    function create_each_block(ctx) {
    	let current;

    	const card = new Card({
    			props: {
    				cardTitle: /*card*/ ctx[1].cardTitle,
    				carrierCode: /*card*/ ctx[1].carrierCode,
    				delay: /*card*/ ctx[1].delay,
    				delayEnd: /*card*/ ctx[1].delayEnd,
    				dateShow: /*card*/ ctx[1].dateShow,
    				dateHide: /*card*/ ctx[1].dateHide
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(card.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(card, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const card_changes = {};
    			if (dirty & /*cards*/ 1) card_changes.cardTitle = /*card*/ ctx[1].cardTitle;
    			if (dirty & /*cards*/ 1) card_changes.carrierCode = /*card*/ ctx[1].carrierCode;
    			if (dirty & /*cards*/ 1) card_changes.delay = /*card*/ ctx[1].delay;
    			if (dirty & /*cards*/ 1) card_changes.delayEnd = /*card*/ ctx[1].delayEnd;
    			if (dirty & /*cards*/ 1) card_changes.dateShow = /*card*/ ctx[1].dateShow;
    			if (dirty & /*cards*/ 1) card_changes.dateHide = /*card*/ ctx[1].dateHide;
    			card.$set(card_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(card, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(12:0) {#each cards as card}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let section;
    	let current;
    	let each_value = /*cards*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			section = element("section");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(section, "class", "section");
    			add_location(section, file$1, 10, 0, 100);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(section, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*cards*/ 1) {
    				each_value = /*cards*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(section, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { cards } = $$props;
    	const writable_props = ["cards"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CardGrid> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("cards" in $$props) $$invalidate(0, cards = $$props.cards);
    	};

    	$$self.$capture_state = () => {
    		return { cards };
    	};

    	$$self.$inject_state = $$props => {
    		if ("cards" in $$props) $$invalidate(0, cards = $$props.cards);
    	};

    	return [cards];
    }

    class CardGrid extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { cards: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CardGrid",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*cards*/ ctx[0] === undefined && !("cards" in props)) {
    			console.warn("<CardGrid> was created without expected prop 'cards'");
    		}
    	}

    	get cards() {
    		throw new Error("<CardGrid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set cards(value) {
    		throw new Error("<CardGrid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/UI/TextInput.svelte generated by Svelte v3.18.2 */

    const file$2 = "src/UI/TextInput.svelte";

    // (18:2) {:else}
    function create_else_block(ctx) {
    	let input;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", /*type*/ ctx[5]);
    			attr_dev(input, "id", /*id*/ ctx[1]);
    			input.value = /*value*/ ctx[4];
    			add_location(input, file$2, 18, 4, 316);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			dispose = listen_dev(input, "input", /*input_handler_1*/ ctx[7], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*type*/ 32) {
    				attr_dev(input, "type", /*type*/ ctx[5]);
    			}

    			if (dirty & /*id*/ 2) {
    				attr_dev(input, "id", /*id*/ ctx[1]);
    			}

    			if (dirty & /*value*/ 16 && input.value !== /*value*/ ctx[4]) {
    				prop_dev(input, "value", /*value*/ ctx[4]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(18:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (16:2) {#if controlType === 'textarea'}
    function create_if_block(ctx) {
    	let textarea;
    	let dispose;

    	const block = {
    		c: function create() {
    			textarea = element("textarea");
    			attr_dev(textarea, "rows", /*rows*/ ctx[3]);
    			attr_dev(textarea, "id", /*id*/ ctx[1]);
    			textarea.value = /*value*/ ctx[4];
    			add_location(textarea, file$2, 16, 4, 260);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, textarea, anchor);
    			dispose = listen_dev(textarea, "input", /*input_handler*/ ctx[6], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*rows*/ 8) {
    				attr_dev(textarea, "rows", /*rows*/ ctx[3]);
    			}

    			if (dirty & /*id*/ 2) {
    				attr_dev(textarea, "id", /*id*/ ctx[1]);
    			}

    			if (dirty & /*value*/ 16) {
    				prop_dev(textarea, "value", /*value*/ ctx[4]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(textarea);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(16:2) {#if controlType === 'textarea'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let label_1;
    	let t0;
    	let t1;

    	function select_block_type(ctx, dirty) {
    		if (/*controlType*/ ctx[0] === "textarea") return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			label_1 = element("label");
    			t0 = text(/*label*/ ctx[2]);
    			t1 = space();
    			if_block.c();
    			attr_dev(label_1, "for", /*id*/ ctx[1]);
    			add_location(label_1, file$2, 14, 2, 189);
    			attr_dev(div, "class", "form-control");
    			add_location(div, file$2, 13, 0, 160);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, label_1);
    			append_dev(label_1, t0);
    			append_dev(div, t1);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*label*/ 4) set_data_dev(t0, /*label*/ ctx[2]);

    			if (dirty & /*id*/ 2) {
    				attr_dev(label_1, "for", /*id*/ ctx[1]);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { controlType } = $$props;
    	let { id } = $$props;
    	let { label } = $$props;
    	let { rows } = $$props;
    	let { value } = $$props;
    	let { type } = $$props;
    	const writable_props = ["controlType", "id", "label", "rows", "value", "type"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<TextInput> was created with unknown prop '${key}'`);
    	});

    	function input_handler(event) {
    		bubble($$self, event);
    	}

    	function input_handler_1(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$props => {
    		if ("controlType" in $$props) $$invalidate(0, controlType = $$props.controlType);
    		if ("id" in $$props) $$invalidate(1, id = $$props.id);
    		if ("label" in $$props) $$invalidate(2, label = $$props.label);
    		if ("rows" in $$props) $$invalidate(3, rows = $$props.rows);
    		if ("value" in $$props) $$invalidate(4, value = $$props.value);
    		if ("type" in $$props) $$invalidate(5, type = $$props.type);
    	};

    	$$self.$capture_state = () => {
    		return {
    			controlType,
    			id,
    			label,
    			rows,
    			value,
    			type
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("controlType" in $$props) $$invalidate(0, controlType = $$props.controlType);
    		if ("id" in $$props) $$invalidate(1, id = $$props.id);
    		if ("label" in $$props) $$invalidate(2, label = $$props.label);
    		if ("rows" in $$props) $$invalidate(3, rows = $$props.rows);
    		if ("value" in $$props) $$invalidate(4, value = $$props.value);
    		if ("type" in $$props) $$invalidate(5, type = $$props.type);
    	};

    	return [controlType, id, label, rows, value, type, input_handler, input_handler_1];
    }

    class TextInput extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			controlType: 0,
    			id: 1,
    			label: 2,
    			rows: 3,
    			value: 4,
    			type: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TextInput",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*controlType*/ ctx[0] === undefined && !("controlType" in props)) {
    			console.warn("<TextInput> was created without expected prop 'controlType'");
    		}

    		if (/*id*/ ctx[1] === undefined && !("id" in props)) {
    			console.warn("<TextInput> was created without expected prop 'id'");
    		}

    		if (/*label*/ ctx[2] === undefined && !("label" in props)) {
    			console.warn("<TextInput> was created without expected prop 'label'");
    		}

    		if (/*rows*/ ctx[3] === undefined && !("rows" in props)) {
    			console.warn("<TextInput> was created without expected prop 'rows'");
    		}

    		if (/*value*/ ctx[4] === undefined && !("value" in props)) {
    			console.warn("<TextInput> was created without expected prop 'value'");
    		}

    		if (/*type*/ ctx[5] === undefined && !("type" in props)) {
    			console.warn("<TextInput> was created without expected prop 'type'");
    		}
    	}

    	get controlType() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set controlType(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rows() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rows(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/UI/Button.svelte generated by Svelte v3.18.2 */

    const file$3 = "src/UI/Button.svelte";

    // (14:0) {:else}
    function create_else_block$1(ctx) {
    	let button;
    	let i;
    	let t;
    	let button_class_value;

    	const block = {
    		c: function create() {
    			button = element("button");
    			i = element("i");
    			t = text(/*caption*/ ctx[1]);
    			attr_dev(i, "class", "material-icons");
    			add_location(i, file$3, 14, 91, 297);
    			attr_dev(button, "class", button_class_value = "" + (/*mode*/ ctx[3] + " btn-floating btn-large waves-effect waves-light red"));
    			attr_dev(button, "href", /*href*/ ctx[2]);
    			attr_dev(button, "type", /*type*/ ctx[0]);
    			add_location(button, file$3, 14, 2, 208);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, i);
    			append_dev(i, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*caption*/ 2) set_data_dev(t, /*caption*/ ctx[1]);

    			if (dirty & /*mode*/ 8 && button_class_value !== (button_class_value = "" + (/*mode*/ ctx[3] + " btn-floating btn-large waves-effect waves-light red"))) {
    				attr_dev(button, "class", button_class_value);
    			}

    			if (dirty & /*href*/ 4) {
    				attr_dev(button, "href", /*href*/ ctx[2]);
    			}

    			if (dirty & /*type*/ 1) {
    				attr_dev(button, "type", /*type*/ ctx[0]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(14:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (12:0) {#if href}
    function create_if_block$1(ctx) {
    	let a;
    	let t;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t = text(/*caption*/ ctx[1]);
    			attr_dev(a, "class", "waves-effect waves-teal btn-flat");
    			attr_dev(a, "href", /*href*/ ctx[2]);
    			add_location(a, file$3, 12, 2, 133);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*caption*/ 2) set_data_dev(t, /*caption*/ ctx[1]);

    			if (dirty & /*href*/ 4) {
    				attr_dev(a, "href", /*href*/ ctx[2]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(12:0) {#if href}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*href*/ ctx[2]) return create_if_block$1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { type } = $$props;
    	let { caption } = $$props;
    	let { href } = $$props;
    	let { mode } = $$props;
    	const writable_props = ["type", "caption", "href", "mode"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Button> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("type" in $$props) $$invalidate(0, type = $$props.type);
    		if ("caption" in $$props) $$invalidate(1, caption = $$props.caption);
    		if ("href" in $$props) $$invalidate(2, href = $$props.href);
    		if ("mode" in $$props) $$invalidate(3, mode = $$props.mode);
    	};

    	$$self.$capture_state = () => {
    		return { type, caption, href, mode };
    	};

    	$$self.$inject_state = $$props => {
    		if ("type" in $$props) $$invalidate(0, type = $$props.type);
    		if ("caption" in $$props) $$invalidate(1, caption = $$props.caption);
    		if ("href" in $$props) $$invalidate(2, href = $$props.href);
    		if ("mode" in $$props) $$invalidate(3, mode = $$props.mode);
    	};

    	return [type, caption, href, mode];
    }

    class Button extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { type: 0, caption: 1, href: 2, mode: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Button",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*type*/ ctx[0] === undefined && !("type" in props)) {
    			console.warn("<Button> was created without expected prop 'type'");
    		}

    		if (/*caption*/ ctx[1] === undefined && !("caption" in props)) {
    			console.warn("<Button> was created without expected prop 'caption'");
    		}

    		if (/*href*/ ctx[2] === undefined && !("href" in props)) {
    			console.warn("<Button> was created without expected prop 'href'");
    		}

    		if (/*mode*/ ctx[3] === undefined && !("mode" in props)) {
    			console.warn("<Button> was created without expected prop 'mode'");
    		}
    	}

    	get type() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get caption() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set caption(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get href() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set href(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get mode() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set mode(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.18.2 */
    const file$4 = "src/App.svelte";

    function create_fragment$4(ctx) {
    	let main;
    	let form;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let t6;
    	let div;
    	let current;
    	let dispose;

    	const textinput0 = new TextInput({
    			props: {
    				id: "cardTitle",
    				label: "Title",
    				type: "text",
    				value: /*cardTitle*/ ctx[0]
    			},
    			$$inline: true
    		});

    	textinput0.$on("input", /*input_handler*/ ctx[8]);

    	const textinput1 = new TextInput({
    			props: {
    				id: "carrierCode",
    				label: "carrierCode",
    				type: "text",
    				value: /*carrierCode*/ ctx[1]
    			},
    			$$inline: true
    		});

    	textinput1.$on("input", /*input_handler_1*/ ctx[9]);

    	const textinput2 = new TextInput({
    			props: {
    				id: "delay",
    				label: "delay",
    				type: "text",
    				value: /*delay*/ ctx[2]
    			},
    			$$inline: true
    		});

    	textinput2.$on("input", /*input_handler_2*/ ctx[10]);

    	const textinput3 = new TextInput({
    			props: {
    				id: "delayEnd",
    				label: "delayEnd URL",
    				type: "text",
    				value: /*delayEnd*/ ctx[3]
    			},
    			$$inline: true
    		});

    	textinput3.$on("input", /*input_handler_3*/ ctx[11]);

    	const textinput4 = new TextInput({
    			props: {
    				id: "dateShow",
    				label: "dateShow",
    				type: "text",
    				value: /*dateShow*/ ctx[4]
    			},
    			$$inline: true
    		});

    	textinput4.$on("input", /*input_handler_4*/ ctx[12]);

    	const textinput5 = new TextInput({
    			props: {
    				id: "dateHide",
    				label: "dateHide",
    				type: "text",
    				value: /*dateHide*/ ctx[5]
    			},
    			$$inline: true
    		});

    	textinput5.$on("input", /*input_handler_5*/ ctx[13]);

    	const button = new Button({
    			props: { type: "submit", caption: "+" },
    			$$inline: true
    		});

    	const cardgrid = new CardGrid({
    			props: { cards: /*cards*/ ctx[6] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			form = element("form");
    			create_component(textinput0.$$.fragment);
    			t0 = space();
    			create_component(textinput1.$$.fragment);
    			t1 = space();
    			create_component(textinput2.$$.fragment);
    			t2 = space();
    			create_component(textinput3.$$.fragment);
    			t3 = space();
    			create_component(textinput4.$$.fragment);
    			t4 = space();
    			create_component(textinput5.$$.fragment);
    			t5 = space();
    			create_component(button.$$.fragment);
    			t6 = space();
    			div = element("div");
    			create_component(cardgrid.$$.fragment);
    			add_location(form, file$4, 51, 1, 893);
    			attr_dev(div, "class", "row");
    			add_location(div, file$4, 90, 2, 1950);
    			add_location(main, file$4, 50, 0, 885);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, form);
    			mount_component(textinput0, form, null);
    			append_dev(form, t0);
    			mount_component(textinput1, form, null);
    			append_dev(form, t1);
    			mount_component(textinput2, form, null);
    			append_dev(form, t2);
    			mount_component(textinput3, form, null);
    			append_dev(form, t3);
    			mount_component(textinput4, form, null);
    			append_dev(form, t4);
    			mount_component(textinput5, form, null);
    			append_dev(form, t5);
    			mount_component(button, form, null);
    			append_dev(main, t6);
    			append_dev(main, div);
    			mount_component(cardgrid, div, null);
    			current = true;
    			dispose = listen_dev(form, "submit", prevent_default(/*addCard*/ ctx[7]), false, true, false);
    		},
    		p: function update(ctx, [dirty]) {
    			const textinput0_changes = {};
    			if (dirty & /*cardTitle*/ 1) textinput0_changes.value = /*cardTitle*/ ctx[0];
    			textinput0.$set(textinput0_changes);
    			const textinput1_changes = {};
    			if (dirty & /*carrierCode*/ 2) textinput1_changes.value = /*carrierCode*/ ctx[1];
    			textinput1.$set(textinput1_changes);
    			const textinput2_changes = {};
    			if (dirty & /*delay*/ 4) textinput2_changes.value = /*delay*/ ctx[2];
    			textinput2.$set(textinput2_changes);
    			const textinput3_changes = {};
    			if (dirty & /*delayEnd*/ 8) textinput3_changes.value = /*delayEnd*/ ctx[3];
    			textinput3.$set(textinput3_changes);
    			const textinput4_changes = {};
    			if (dirty & /*dateShow*/ 16) textinput4_changes.value = /*dateShow*/ ctx[4];
    			textinput4.$set(textinput4_changes);
    			const textinput5_changes = {};
    			if (dirty & /*dateHide*/ 32) textinput5_changes.value = /*dateHide*/ ctx[5];
    			textinput5.$set(textinput5_changes);
    			const cardgrid_changes = {};
    			if (dirty & /*cards*/ 64) cardgrid_changes.cards = /*cards*/ ctx[6];
    			cardgrid.$set(cardgrid_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(textinput0.$$.fragment, local);
    			transition_in(textinput1.$$.fragment, local);
    			transition_in(textinput2.$$.fragment, local);
    			transition_in(textinput3.$$.fragment, local);
    			transition_in(textinput4.$$.fragment, local);
    			transition_in(textinput5.$$.fragment, local);
    			transition_in(button.$$.fragment, local);
    			transition_in(cardgrid.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(textinput0.$$.fragment, local);
    			transition_out(textinput1.$$.fragment, local);
    			transition_out(textinput2.$$.fragment, local);
    			transition_out(textinput3.$$.fragment, local);
    			transition_out(textinput4.$$.fragment, local);
    			transition_out(textinput5.$$.fragment, local);
    			transition_out(button.$$.fragment, local);
    			transition_out(cardgrid.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(textinput0);
    			destroy_component(textinput1);
    			destroy_component(textinput2);
    			destroy_component(textinput3);
    			destroy_component(textinput4);
    			destroy_component(textinput5);
    			destroy_component(button);
    			destroy_component(cardgrid);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let cardTitle = "";
    	let carrierCode = "";
    	let delay = "";
    	let delayEnd = "";
    	let dateShow = "";
    	let dateHide = "";

    	let cards = [
    		{
    			id: "c1",
    			cardTitle: "UPS",
    			carrierCode: "gnd",
    			delay: null,
    			delayEnd: null,
    			dateShow: null,
    			dateHide: null
    		},
    		{
    			id: "c2",
    			cardTitle: "UPS",
    			carrierCode: "Express",
    			delay: null,
    			delayEnd: null,
    			dateShow: null,
    			dateHide: null
    		}
    	];

    	function addCard() {
    		console.log("Triggered!");

    		const newCard = {
    			id: Math.random().toString(),
    			cardTitle,
    			carrierCode,
    			delay,
    			delayEnd,
    			dateShow,
    			dateHide
    		};

    		$$invalidate(6, cards = [newCard, ...cards]);
    	}

    	const input_handler = event => $$invalidate(0, cardTitle = event.target.value);
    	const input_handler_1 = event => $$invalidate(1, carrierCode = event.target.value);
    	const input_handler_2 = event => $$invalidate(2, delay = event.target.value);
    	const input_handler_3 = event => $$invalidate(3, delayEnd = event.target.value);
    	const input_handler_4 = event => $$invalidate(4, dateShow = event.target.value);
    	const input_handler_5 = event => $$invalidate(5, dateHide = event.target.value);

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("cardTitle" in $$props) $$invalidate(0, cardTitle = $$props.cardTitle);
    		if ("carrierCode" in $$props) $$invalidate(1, carrierCode = $$props.carrierCode);
    		if ("delay" in $$props) $$invalidate(2, delay = $$props.delay);
    		if ("delayEnd" in $$props) $$invalidate(3, delayEnd = $$props.delayEnd);
    		if ("dateShow" in $$props) $$invalidate(4, dateShow = $$props.dateShow);
    		if ("dateHide" in $$props) $$invalidate(5, dateHide = $$props.dateHide);
    		if ("cards" in $$props) $$invalidate(6, cards = $$props.cards);
    	};

    	return [
    		cardTitle,
    		carrierCode,
    		delay,
    		delayEnd,
    		dateShow,
    		dateHide,
    		cards,
    		addCard,
    		input_handler,
    		input_handler_1,
    		input_handler_2,
    		input_handler_3,
    		input_handler_4,
    		input_handler_5
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
