define([
    'jquery',
    'ko',
    'uiComponent',
    'Magento_Checkout/js/view/summary/abstract-total',
    'Magento_Checkout/js/model/quote'
], function($, ko, uiComponent, Component, quote) {
    'use strict';

    return Component.extend({
        defaults: {
            template: 'AHT_FreeShippingMesseage/messeage/messeage-subtotal'
        },

        miniOrder: ko.observable(0),
        check: ko.observable(false),

        /**
         * @return {*}
         */
        isDisplayed: function() {
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
            const self = this;
            const serviceUrl = 'http://127.0.0.1/magento1/subtotal/ajax/subtotal';

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