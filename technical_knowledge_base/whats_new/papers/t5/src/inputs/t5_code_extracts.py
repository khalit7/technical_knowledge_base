# Excerpts of t5/data/preprocessors.py, ported to JS on this page (span corruption and its lengths)
# Source: https://github.com/google-research/text-to-text-transfer-transformer/blob/main/t5/data/preprocessors.py (fetched 2026-10-02)
def random_spans_helper(inputs_length=gin.REQUIRED,
                        noise_density=gin.REQUIRED,
                        mean_noise_span_length=gin.REQUIRED,
                        extra_tokens_per_span_inputs=gin.REQUIRED,
                        extra_tokens_per_span_targets=gin.REQUIRED,
                        verbose=False):
  """Training parameters to avoid padding with random_spans_noise_mask.

  When training a model with random_spans_noise_mask, we would like to set the
  other training hyperparmeters in a way that avoids padding.  This function
  helps us compute these hyperparameters.

  We assume that each noise span in the input is replaced by
  extra_tokens_per_span_inputs sentinel tokens, and each non-noise span in the
  targets is replaced by extra_tokens_per_span_targets sentinel tokens.

  This function tells us the required number of tokens in the raw example (for
  split_tokens()) as well as the length of the encoded targets.

  Note that this function assumes the inputs and targets will have EOS appended
  and includes that in the reported length.

  Args:
    inputs_length: an integer - desired length of the tokenized inputs sequence
    noise_density: a float
    mean_noise_span_length: a float
    extra_tokens_per_span_inputs: an integer
    extra_tokens_per_span_targets: an integer
    verbose: a bool indicating whether to log sequence lengths
  Returns:
    tokens_length: length of original text in tokens
    targets_length: an integer - length in tokens of encoded targets sequence
  """
  def _tokens_length_to_inputs_length_targets_length(tokens_length):
    num_noise_tokens = int(round(tokens_length * noise_density))
    num_nonnoise_tokens = tokens_length - num_noise_tokens
    num_noise_spans = int(round(num_noise_tokens / mean_noise_span_length))  # pyrefly: ignore[unsupported-operation]
    # inputs contain all nonnoise tokens, sentinels for all noise spans
    # and one EOS token.
    return (
        num_nonnoise_tokens +
        num_noise_spans * extra_tokens_per_span_inputs + 1,  # pyrefly: ignore[unsupported-operation]
        num_noise_tokens +
        num_noise_spans * extra_tokens_per_span_targets + 1)  # pyrefly: ignore[unsupported-operation]

  tokens_length = inputs_length - 1  # pyrefly: ignore[unsupported-operation]
  while (_tokens_length_to_inputs_length_targets_length(tokens_length + 1)[0]
         <= inputs_length):
    tokens_length += 1
  inputs_length, targets_length = (
      _tokens_length_to_inputs_length_targets_length(tokens_length))
  # minor hack to get the targets length to be equal to inputs length
  # which is more likely to have been set to a nice round number.
  if noise_density == 0.5 and targets_length > inputs_length:
    tokens_length -= 1
def iid_noise_mask(length, noise_density, seeds):
  """Independent and identically distributed token noise.

  Args:
    length: an int32 scalar.
    noise_density: a float - approximate density of output mask.
    seeds: an int32 Tensor, shaped (1, 2), the random seed.

  Returns:
    a boolean tensor with shape [length].
  """
  return tf.random.stateless_uniform([length], seed=seeds[0]) < noise_density

def random_spans_noise_mask(
    length,
    noise_density,
    seeds,
    mean_noise_span_length=3.0,
    random_roll=False,
    batch_size=None,
):
  """Noise mask consisting of random spans of noise tokens.

  The number of noise tokens and the number of noise spans and non-noise spans
  are determined deterministically as follows:

    num_noise_tokens = round(length * noise_density)
    num_nonnoise_spans = num_noise_spans = round(
       num_noise_tokens / mean_noise_span_length)

  Spans alternate between non-noise and noise, beginning with non-noise.
  Subject to the above restrictions, all masks are equally likely.

  Args:
    length: an int32 scalar (length of the incoming token sequence)
    noise_density: a float - approximate density of output mask
    seeds: an int32 Tensor, shaped (2, 2)
    mean_noise_span_length: a number
    random_roll: bool, whether to roll the mask by a random integer offset in
      [0, length). Set random_roll to True to get a more uniform distribution
      of masked positions. Specifically, when random_roll is False (default) and
      a single span is enough to satisfy the noise density requirement, this
      fuction masks only the last few positions.
    batch_size: an int32; if set, a batch of masks of shape [batch_size, length]
      is returned.

  Returns:
    a boolean tensor with shape [length] or [batch_size, length] if batch_size
    is set.
  """

  if noise_density == 0.0:
    return tf.zeros(length, tf.bool)

  orig_length = length
  # increase length to avoid degeneracy
  length = tf.maximum(length, 2)
  def to_int(x):
    return tf.cast(x, tf.int32)
  def to_float(x):
    return tf.cast(x, tf.float32)
  num_noise_tokens = to_int(tf.round(to_float(length) * noise_density))
  # avoid degeneracy by ensuring positive numbers of noise and nonnoise tokens.
  num_noise_tokens = tf.minimum(tf.maximum(num_noise_tokens, 1), length - 1)
  num_noise_spans = to_int(
      tf.round(to_float(num_noise_tokens) / mean_noise_span_length))
  # avoid degeneracy by ensuring positive number of noise spans
  num_noise_spans = tf.maximum(num_noise_spans, 1)
  num_nonnoise_tokens = length - num_noise_tokens
  if batch_size:
    # Create seeds to generate masks for each row.
    seeds = tf.unstack(
        tf.random.experimental.stateless_split(seeds[0], batch_size * 2)
    )
  # pick the lengths of the noise spans and the non-noise spans
  def _random_segmentation(num_items, num_segments, seed):
    """Partition a sequence of items randomly into non-empty segments.

    Args:
      num_items: an integer scalar > 0
      num_segments: an integer scalar in [1, num_items]
      seed: an integer seed
    Returns:
      a Tensor with shape [num_segments] containing positive integers that add
      up to num_items
    """
    first_in_segment = tf.pad(
        seqio.stateless_shuffle(
            to_int(tf.range(num_items - 1) < num_segments - 1),
            seed),
        [[1, 0]])
    segment_id = tf.cumsum(first_in_segment)
    segment_length = tf.math.segment_sum(tf.ones_like(segment_id), segment_id)
    return segment_length
  masks = []
  for i in range(batch_size or 1):
    noise_span_lengths = _random_segmentation(
        num_noise_tokens, num_noise_spans, seeds[2 * i])
    nonnoise_span_lengths = _random_segmentation(
        num_nonnoise_tokens, num_noise_spans, seeds[2 * i + 1])
    interleaved_span_lengths = tf.reshape(
        tf.stack([nonnoise_span_lengths, noise_span_lengths], axis=1),
        [num_noise_spans * 2])
    span_starts = tf.cumsum(interleaved_span_lengths)[:-1]
    span_start_indicator = tf.math.unsorted_segment_sum(
        tf.ones_like(span_starts), span_starts, length)
    span_num = tf.cumsum(span_start_indicator)
    is_noise = tf.equal(span_num % 2, 1)

    mask = is_noise[:orig_length]

    if random_roll:
      roll_seed = (seeds[0][0]+seeds[1][1], seeds[0][1]-seeds[1][0])  # new seed
      # Roll the mask by a random offset e.g. for offset=2: [1,2,3,4] =>
      # [3,4,1,2]
      offset = tf.random.stateless_uniform(
          [1], seed=roll_seed, dtype=tf.int32, minval=0, maxval=length)[0]
      mask = tf.roll(mask, shift=offset, axis=0)
    masks.append(mask)

  if not batch_size:
    return masks[0]
  return tf.stack(masks, axis=0)

def noise_span_to_unique_sentinel(
    tokens, noise_mask, vocabulary, seeds, batch_size=None
):
  """Replace each run of consecutive noise tokens with a different sentinel.

  The idea here is to be able to align the dropped spans in the inputs
  with the markers in the targets.

  We want to generate training examples like
  "We hold X to be Y that" -> "X these truths Y self evident Z"

  Sentinels assigned in decreasing order within the sequence starting at
  vocabulary.size - 1.  That is, we appropriate the last tokens in the
  vocabulary for additional use as sentinels.

  TODO(noam): we may want to try enlarging the vocabulary and leaving room
  for the sentinels instead.  However, this requires enlarging the embedding
  tables in the model, so that is a bigger change.

  Args:
    tokens: a 1d integer Tensor
    noise_mask: a boolean Tensor with the same shape as tokens
    vocabulary: a vocabulary.Vocabulary
    seeds: an unused int32 Tensor
    batch_size: an optional int32; if tokens are batched.

  Returns:
    a Tensor with the same shape and dtype as tokens
  """
  del seeds
  if batch_size:
    def shift_batched_right_by_one(arr, fill_value):
      if not (arr.dtype.is_integer or arr.dtype.is_floating):
        raise ValueError(f'Only numeric types are supported. Got: {arr.dtype}')
      # tf.roll wraps around the axis.
      rolled = tf.roll(arr, shift=1, axis=1)

      # Zero out the first position by multiplying with [0, 1, 1, ..., 1].
      depth = tf.shape(arr)[1]
      mask = tf.one_hot(
          0, depth=depth, on_value=0, off_value=1, dtype=arr.dtype
      )
      # Tile the mask to match batch size
      shape = tf.shape(arr)
      mask = tf.tile(tf.expand_dims(mask, axis=0), [batch_size, 1])
      # Broadcast mask to match shape of rolled
      for _ in range(len(shape) - 2):
        mask = tf.expand_dims(mask, axis=-1)
      return rolled * mask + (1 - mask) * fill_value
    int_mask = tf.cast(noise_mask, tf.int32)
    shifted_mask = shift_batched_right_by_one(int_mask, fill_value=0)
    prev_token_is_noise = tf.cast(shifted_mask, tf.bool)
  else:
    prev_token_is_noise = tf.pad(noise_mask[:-1], [[1, 0]])

  first_noise_tokens = tf.logical_and(
      noise_mask, tf.logical_not(prev_token_is_noise))
  subsequent_noise_tokens = tf.logical_and(noise_mask, prev_token_is_noise)

  sentinel = (
      sentinel_id(vocabulary)
      + 1
      - tf.cumsum(tf.cast(first_noise_tokens, tokens.dtype), axis=-1)
  )

  tokens = tf.where(first_noise_tokens, sentinel, tokens)
  denoised = tf.ragged.boolean_mask(
      tokens, tf.logical_not(subsequent_noise_tokens)
  )
  if isinstance(denoised, tf.RaggedTensor):
    denoised = denoised.to_tensor()
  return denoised


@gin.configurable()

# _relative_position_bucket from https://github.com/huggingface/transformers/blob/main/src/transformers/models/t5/modeling_t5.py
217:    def _relative_position_bucket(relative_position, bidirectional=True, num_buckets=32, max_distance=128):
218-        """
219-        Adapted from Mesh Tensorflow:
220-        https://github.com/tensorflow/mesh/blob/0cb87fe07da627bf0b7e60475d59f95ed6b5be3d/mesh_tensorflow/transformer/transformer_layers.py#L593
221-
222-        Translate relative position to a bucket number for relative attention. The relative position is defined as
223-        memory_position - query_position, i.e. the distance in tokens from the attending position to the attended-to
224-        position. If bidirectional=False, then positive relative positions are invalid. We use smaller buckets for
225-        small absolute relative_position and larger buckets for larger absolute relative_positions. All relative
226-        positions >=max_distance map to the same bucket. All relative positions <=-max_distance map to the same bucket.
227-        This should allow for more graceful generalization to longer sequences than the model has been trained on
228-
229-        Args:
230-            relative_position: an int32 Tensor
231-            bidirectional: a boolean - whether the attention is bidirectional
232-            num_buckets: an integer
233-            max_distance: an integer
234-
235-        Returns:
236-            a Tensor with the same shape as relative_position, containing int32 values in the range [0, num_buckets)
237-        """
238-        relative_buckets = 0
239-        if bidirectional:
240-            num_buckets //= 2
241-            relative_buckets += (relative_position > 0).to(torch.long) * num_buckets
242-            relative_position = torch.abs(relative_position)
243-        else:
244-            relative_position = -torch.min(relative_position, torch.zeros_like(relative_position))
245-        # now relative_position is in the range [0, inf)
246-
247-        # half of the buckets are for exact increments in positions
248-        max_exact = num_buckets // 2
249-        is_small = relative_position < max_exact
250-
251-        # The other half of the buckets are for logarithmically bigger bins in positions up to max_distance
252-        relative_position_if_large = max_exact + (
253-            torch.log(relative_position.float() / max_exact)
254-            / math.log(max_distance / max_exact)
255-            * (num_buckets - max_exact)
256-        ).to(torch.long)
257-        relative_position_if_large = torch.min(
258-            relative_position_if_large, torch.full_like(relative_position_if_large, num_buckets - 1)
259-        )
260-
261-        relative_buckets += torch.where(is_small, relative_position, relative_position_if_large)
262-        return relative_buckets
