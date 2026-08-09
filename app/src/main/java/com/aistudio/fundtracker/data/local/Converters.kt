package com.aistudio.fundtracker.data.local

import androidx.room.TypeConverter
import com.aistudio.fundtracker.model.AssetType
import com.aistudio.fundtracker.model.Position

class Converters {
    @TypeConverter
    fun fromAssetType(value: AssetType): String = value.name

    @TypeConverter
    fun toAssetType(value: String): AssetType = AssetType.valueOf(value)

    @TypeConverter
    fun fromPosition(value: Position): String = value.name

    @TypeConverter
    fun toPosition(value: String): Position = Position.valueOf(value)
}
