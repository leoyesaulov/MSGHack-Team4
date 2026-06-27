"""
Quorum calculation module for CityVoice proposals.
Determines the vote threshold based on proposal location.
"""

def calculate_threshold(latitude: float | None = None, longitude: float | None = None) -> int:
    """
    Calculate the vote threshold for a proposal.

    Args:
        latitude: Optional proposal latitude
        longitude: Optional proposal longitude

    Returns:
        int: Vote threshold (default: 50)
    """
    # Default threshold for Ismaning
    return 50
