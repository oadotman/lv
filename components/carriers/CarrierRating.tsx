/**
 * Carrier Rating Component
 * Allows brokers to rate carriers from 1-5 stars with notes
 */

'use client';

import { useState } from 'react';
import { Star, MessageSquare, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CarrierRatingProps {
  carrierId: string;
  currentRating?: number;
  currentNotes?: string;
  carrierName: string;
  onSave: (rating: number, notes: string) => Promise<void>;
  onClose?: () => void;
}

export function CarrierRating({
  carrierId,
  currentRating = 0,
  currentNotes = '',
  carrierName,
  onSave,
  onClose
}: CarrierRatingProps) {
  const [rating, setRating] = useState(currentRating);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [notes, setNotes] = useState(currentNotes);
  const [saving, setSaving] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const handleSave = async () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    setSaving(true);
    try {
      await onSave(rating, notes);
      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving rating:', error);
      alert('Failed to save rating');
    } finally {
      setSaving(false);
    }
  };

  const getRatingText = (value: number) => {
    const texts = {
      1: 'Poor - Would not use again',
      2: 'Below Average - Major issues',
      3: 'Average - Some issues',
      4: 'Good - Minor issues only',
      5: 'Excellent - Highly recommended'
    };
    return texts[value as keyof typeof texts] || '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Rate Carrier</h3>
          <p className="text-sm text-gray-600">{carrierName}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Star Rating */}
      <div className="mb-4">
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <motion.button
              key={star}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="focus:outline-none"
            >
              <Star
                className={`w-8 h-8 transition-colors ${
                  star <= (hoveredRating || rating)
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300'
                }`}
              />
            </motion.button>
          ))}
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {getRatingText(hoveredRating || rating)}
        </p>
      </div>

      {/* Quick Rating Tags */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Quick Feedback:</p>
        <div className="flex flex-wrap gap-2">
          {[
            'On Time',
            'Good Communication',
            'Professional',
            'Equipment Issues',
            'Late Pickup',
            'Poor Communication'
          ].map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setNotes((prev) =>
                  prev.includes(tag) ? prev : `${prev} ${tag}`.trim()
                );
              }}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                notes.includes(tag)
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } border`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Notes Section */}
      <div className="mb-4">
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="flex items-center text-sm text-blue-600 hover:text-blue-700 mb-2"
        >
          <MessageSquare className="w-4 h-4 mr-1" />
          {showNotes ? 'Hide' : 'Add'} Notes
        </button>

        <AnimatePresence>
          {showNotes && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add detailed notes about this carrier's performance..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving || rating === 0}
        className={`w-full flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors ${
          saving || rating === 0
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {saving ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Save Rating
          </>
        )}
      </button>
    </motion.div>
  );
}

/**
 * Carrier Rating Display Component
 * Shows the current rating in a compact format
 */
export function CarrierRatingDisplay({
  rating,
  totalLoads = 0,
  compact = false
}: {
  rating: number;
  totalLoads?: number;
  compact?: boolean;
}) {
  if (!rating) {
    return (
      <span className="text-sm text-gray-500">
        {compact ? 'Unrated' : 'Not yet rated'}
      </span>
    );
  }

  return (
    <div className="flex items-center space-x-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
      {!compact && totalLoads > 0 && (
        <span className="text-sm text-gray-600">
          ({totalLoads} loads)
        </span>
      )}
    </div>
  );
}

/**
 * Carrier Performance Badge
 * Shows a quick performance indicator
 */
export function CarrierPerformanceBadge({ rating }: { rating: number }) {
  const getBadgeConfig = () => {
    if (rating >= 4.5) {
      return {
        label: 'Top Performer',
        color: 'bg-green-100 text-green-800',
        icon: '⭐'
      };
    }
    if (rating >= 3.5) {
      return {
        label: 'Reliable',
        color: 'bg-blue-100 text-blue-800',
        icon: '✓'
      };
    }
    if (rating >= 2.5) {
      return {
        label: 'Average',
        color: 'bg-gray-100 text-gray-800',
        icon: '—'
      };
    }
    if (rating > 0) {
      return {
        label: 'Needs Improvement',
        color: 'bg-orange-100 text-orange-800',
        icon: '!'
      };
    }
    return null;
  };

  const config = getBadgeConfig();
  if (!config) return null;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </span>
  );
}

/**
 * Rating History Component
 * Shows rating history over time
 */
export function CarrierRatingHistory({
  history
}: {
  history: Array<{ date: string; rating: number; notes?: string; load_number?: string }>
}) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No rating history available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((entry, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="border-l-2 border-gray-200 pl-4 py-2"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-2">
                <CarrierRatingDisplay rating={entry.rating} compact />
                {entry.load_number && (
                  <span className="text-sm text-gray-600">
                    Load #{entry.load_number}
                  </span>
                )}
              </div>
              {entry.notes && (
                <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
              )}
            </div>
            <span className="text-xs text-gray-500">
              {new Date(entry.date).toLocaleDateString()}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}