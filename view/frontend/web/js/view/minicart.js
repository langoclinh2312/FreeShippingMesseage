/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */

define([
    'uiComponent',
    'Magento_Customer/js/customer-data',
    'Magento_Checkout/js/view/summary/abstract-total',
    'Magento_Checkout/js/model/quote',
    'Magento_Catalog/js/price-utils',
    'jquery',
    'ko',
    'underscore',
    'sidebar',
    'mage/translate',
    'mage/dropdown'
], function(uiComponent, customerData, Component, quote, priceUtils, $, ko, _) {
    'use strict';

    var sidebarInitialized = false,
        addToCartCalls = 0,
        miniCart;

    miniCart = $('[data-block=\'minicart\']');

    /**
     * @return {Boolean}
     */
    function initSidebar() {
        if (miniCart.data('mageSidebar')) {
            miniCart.sidebar('update');
        }

        if (!$('[data-role=product-item]').length) {
            return false;
        }
        miniCart.trigger('contentUpdated');

        if (sidebarInitialized) {
            return false;
        }
        sidebarInitialized = true;
        miniCart.sidebar({
            'targetElement': 'div.block.block-minicart',
            'url': {
                'checkout': window.checkout.checkoutUrl,
                'update': window.checkout.updateItemQtyUrl,
                'remove': window.checkout.removeItemUrl,
                'loginUrl': window.checkout.customerLoginUrl,
                'isRedirectRequired': window.checkout.isRedirectRequired
            },
            'button': {
                'checkout': '#top-cart-btn-checkout',
                'remove': '#mini-cart a.action.delete',
                'close': '#btn-minicart-close'
            },
            'showcart': {
                'parent': 'span.counter',
                'qty': 'span.counter-number',
                'label': 'span.counter-label'
            },
            'minicart': {
                'list': '#mini-cart',
                'content': '#minicart-content-wrapper',
                'qty': 'div.items-total',
                'subtotal': 'div.subtotal span.price',
                'maxItemsVisible': window.checkout.minicartMaxItemsVisible
            },
            'item': {
                'qty': ':input.cart-item-qty',
                'button': ':button.update-cart-item'
            },
            'confirmMessage': $.mage.__('Are you sure you would like to remove this item from the shopping cart?')
        });
    }

    miniCart.on('dropdowndialogopen', function() {
        initSidebar();
    });

    return Component.extend({
        shoppingCartUrl: window.checkout.shoppingCartUrl,
        maxItemsToDisplay: window.checkout.maxItemsToDisplay,
        cart: {},
        miniOrder: ko.observable(0),
        check: ko.observable(false),

        // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
        /**
         * @override
         */
        initialize: function() {
            var self = this,
                cartData = customerData.get('cart');

            this.update(cartData());
            cartData.subscribe(function(updatedCart) {
                addToCartCalls--;
                this.isLoading(addToCartCalls > 0);
                sidebarInitialized = false;
                this.update(updatedCart);
                initSidebar();
            }, this);
            $('[data-block="minicart"]').on('contentLoading', function() {
                addToCartCalls++;
                self.isLoading(true);
            });

            if (
                cartData().website_id !== window.checkout.websiteId && cartData().website_id !== undefined ||
                cartData().storeId !== window.checkout.storeId && cartData().storeId !== undefined
            ) {
                customerData.reload(['cart'], false);
            }

            return this._super();
        },
        //jscs:enable requireCamelCaseOrUpperCaseIdentifiers

        isLoading: ko.observable(false),
        initSidebar: initSidebar,

        /**
         * Close mini shopping cart.
         */
        closeMinicart: function() {
            $('[data-block="minicart"]').find('[data-role="dropdownDialog"]').dropdownDialog('close');
        },

        /**
         * @return {Boolean}
         */
        closeSidebar: function() {
            var minicart = $('[data-block="minicart"]');

            minicart.on('click', '[data-action="close"]', function(event) {
                event.stopPropagation();
                minicart.find('[data-role="dropdownDialog"]').dropdownDialog('close');
            });

            return true;
        },

        /**
         * @param {String} productType
         * @return {*|String}
         */
        getItemRenderer: function(productType) {
            return this.itemRenderer[productType] || 'defaultRenderer';
        },

        /**
         * Update mini shopping cart content.
         *
         * @param {Object} updatedCart
         * @returns void
         */
        update: function(updatedCart) {
            _.each(updatedCart, function(value, key) {
                if (!this.cart.hasOwnProperty(key)) {
                    this.cart[key] = ko.observable();
                }
                this.cart[key](value);
            }, this);
        },

        /**
         * Get cart param by name.
         * @param {String} name
         * @returns {*}
         */
        getCartParam: function(name) {
            if (!_.isUndefined(name)) {
                if (!this.cart.hasOwnProperty(name)) {
                    this.cart[name] = ko.observable();
                }
            }

            return this.cart[name]();
        },

        /**
         * Returns array of cart items, limited by 'maxItemsToDisplay' setting
         * @returns []
         */
        getCartItems: function() {
            var items = this.getCartParam('items') || [];

            items = items.slice(parseInt(-this.maxItemsToDisplay, 10));

            return items;
        },

        /**
         * Returns count of cart line items
         * @returns {Number}
         */
        getCartLineItemsCount: function() {
            var items = this.getCartParam('items') || [];

            return parseInt(items.length, 10);
        },

        /**
         * Formats the price according to store
         *
         * @param {number} Price to be formatted
         * @return {string} Returns the formatted price
         */
        getFormattedPrice: function(price) {
            let priceFormat = {
                decimalSymbol: '.',
                groupLength: 3,
                groupSymbol: ",",
                integerRequired: false,
                pattern: "$%s",
                precision: 2,
                requiredPrecision: 2
            };

            return priceUtils.formatPrice(price, priceFormat);
        },

        /**
         * @return {*}
         */
        isDisplayed: function() {
            console.log(this.getPureValue());
            return this.isFullMode();
        },

        /**
         * Get pure value.
         */
        getPureValue: function() {
            var totals = quote.getTotals()();

            if (totals) {
                return totals['grand_total'];
            }

            return quote['grand_total'];
        },

        /**
         * @return {*|int}
         */
        getGrandTotal: function() {
            return this.getPureValue();
        },

        /**
         * @return {*|int}
         */
        getMiniOrder: function() {
            const self = this,
                serviceUrl = 'http://127.0.0.1/magento1/subtotal/ajax/subtotal';

            return $.ajax({
                url: serviceUrl,
                type: 'GET',
                dataType: 'json',
                success: function(response) {
                    self.miniOrder(response);
                    self.check(true);
                },
                error: function(textStatus) {
                    if (textStatus === 'timeout') {
                        $('.table-content').removeClass('loading');
                    }
                }
            });
        },

        /**
         * @return {*|string}
         */
        getMesseage: function() {
            const self = this;
            this.getMiniOrder();
            if (self.check() == true) {
                if (self.miniOrder() - this.getGrandTotal() > 0) {
                    return 'Remaining order amount to get free shipping is ' + this.getFormattedPrice(self.miniOrder() - this.getGrandTotal());
                } else if (self.miniOrder() - this.getGrandTotal() == 0 || self.miniOrder() - this.getGrandTotal() < 0) {
                    return 'The order amount is eligible for free shipping';
                }
            }

        }
    });
});