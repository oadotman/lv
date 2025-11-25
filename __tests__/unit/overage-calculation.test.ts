// =====================================================
// OVERAGE CALCULATION TESTS
// Tests pricing and overage logic
// =====================================================

import { calculateOverageCost, getUsageStatus } from '@/lib/pricing';
import { OVERAGE_CONFIG } from '@/lib/overage';

describe('Overage Calculation', () => {
  describe('calculateOverageCost', () => {
    it('should return 0 for usage within limit', () => {
      const cost = calculateOverageCost(1000, 'solo'); // Solo has 1500 min
      expect(cost).toBe(0);
    });

    it('should calculate overage correctly', () => {
      const cost = calculateOverageCost(1600, 'solo'); // 100 min over
      expect(cost).toBe(2); // 100 * $0.02 = $2.00
    });

    it('should handle exact limit usage', () => {
      const cost = calculateOverageCost(1500, 'solo');
      expect(cost).toBe(0);
    });

    it('should calculate large overages', () => {
      const cost = calculateOverageCost(2000, 'solo'); // 500 min over
      expect(cost).toBe(10); // 500 * $0.02 = $10.00
    });
  });

  describe('getUsageStatus', () => {
    it('should return "ok" for low usage', () => {
      const status = getUsageStatus(500, 'solo'); // 33% used
      expect(status.status).toBe('ok');
    });

    it('should return "warning" at 80% usage', () => {
      const status = getUsageStatus(1200, 'solo'); // 80% used
      expect(status.status).toBe('warning');
    });

    it('should return "critical" at 95% usage', () => {
      const status = getUsageStatus(1425, 'solo'); // 95% used
      expect(status.status).toBe('critical');
    });

    it('should return "overage" when limit exceeded', () => {
      const status = getUsageStatus(1600, 'solo'); // 106% used
      expect(status.status).toBe('overage');
      expect(status.percentage).toBeGreaterThan(100);
    });
  });

  describe('Overage Pack Pricing', () => {
    it('should have correct pack prices', () => {
      expect(OVERAGE_CONFIG.packs.small.price).toBe(10);
      expect(OVERAGE_CONFIG.packs.medium.price).toBe(18);
      expect(OVERAGE_CONFIG.packs.large.price).toBe(40);
      expect(OVERAGE_CONFIG.packs.xlarge.price).toBe(75);
    });

    it('should have correct discount percentages', () => {
      const baseRate = OVERAGE_CONFIG.pricePerMinute;

      // Small: no discount (500 * 0.02 = $10)
      expect(OVERAGE_CONFIG.packs.small.price).toBe(500 * baseRate);

      // Medium: 10% discount (1000 * 0.02 = $20, but $18)
      const mediumExpected = 1000 * baseRate * 0.9;
      expect(OVERAGE_CONFIG.packs.medium.price).toBe(mediumExpected);

      // Large: 20% discount (2500 * 0.02 = $50, but $40)
      const largeExpected = 2500 * baseRate * 0.8;
      expect(OVERAGE_CONFIG.packs.large.price).toBe(largeExpected);

      // XLarge: 25% discount (5000 * 0.02 = $100, but $75)
      const xlargeExpected = 5000 * baseRate * 0.75;
      expect(OVERAGE_CONFIG.packs.xlarge.price).toBe(xlargeExpected);
    });
  });
});
