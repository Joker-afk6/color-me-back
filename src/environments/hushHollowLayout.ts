/**
 * Shared layout numbers for Hush Hollow's P02 Tutorial A (used by the level and by the solvability
 * tests, so the tests prove the real geometry). PLACEHOLDER greybox values.
 */

/**
 * A safe 0.7 m "visual gap" brook across the path (Director Script P02). It is narrower than the
 * explorer's collider (radius 0.38 m), so walking across never drops a child in; the floor is still
 * a hazard (instant ledge reset) as a safety net.
 */
export const BROOK = { x0: -6.5, x1: 3.5, z: 6.5, width: 0.7, floorY: -0.5 } as const;

/** The broad courtyard stripe for Basic Dash practice (axis-aligned along z, run toward −z). */
export const DASH_STRIPE = { x: 0.6, z0: 3.2, z1: -5.2, width: 2.6 } as const;
